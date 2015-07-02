(function (){
  var historyList = [""],
      historyPosition = 0,
      _win, // a top-level context
      question,
      inputCommand,
      outputResult;
      matchNumber = null;
  window.shellScript = this;

  function refocus() {
      inputCommand.focus();
  }

  init = function() {
      inputCommand = document.getElementById("input");
      outputResult = document.getElementById("output");
      _win = window;
      initTarget();
      refocus();
  }

  function initTarget() {
      _win.Shell = window;
  }

  focusTextbox = function(event) {
      refocus();
  } 

  function changeInputHeight()
  {
    var rows = inputCommand.value.split(/\n/).length
      + 2;

    if (inputCommand.rows != rows) // without this check, it is impossible to select text in Opera 7.60 or Opera 8.0.
      inputCommand.rows = rows;
  }

  inputKeydown = function(e) {
    if (e.shiftKey && e.keyCode == 13) { 
      changeInputHeight();
    } else if (e.keyCode == 13) { 
      try { runCmd(); } catch(er) { alert(er); };
      setTimeout(function() { inputCommand.value = ""; changeInputHeight(); }, 0); 
    } else if (e.keyCode == 38) { // up
              if(inputCommand.value.indexOf("\n") == -1 || inputCommand.selectionStart <= inputCommand.value.indexOf("\n"))
        history(true);
    } else if (e.keyCode == 40) { // down
              if(inputCommand.selectionEnd > inputCommand.value.indexOf("\n"))
        history(false);
    } else if (e.keyCode == 9) { // tab
      tabcomplete();
      setTimeout(function() { refocus(); }, 0); // refocus because tab was hit
    } else { }
  };

  function history(up)
  {
    var listLength = historyList.length;

    if (listLength == 1)
      return;

    if (up)
    {
      if (historyPosition == listLength-1)
      {
        // Save this entry in case the user hits the down key.
        historyList[historyPosition] = inputCommand.value;
      }

      if (historyPosition > 0)
      {
        historyPosition--;
        // Use a timeout to prevent up from moving cursor within new text
        // Set to nothing first for the same reason
        setTimeout(
          function() {
            inputCommand.value = '';
            inputCommand.value = historyList[historyPosition];
            var caretPos = inputCommand.value.length;
            if (inputCommand.setSelectionRange)
              inputCommand.setSelectionRange(caretPos, caretPos);
          },
          0
        );
      }
    }
    else // down
    {
      if (historyPosition < listLength-1)
      {
        historyPosition++;
        inputCommand.value = historyList[historyPosition];
      }
      else if (historyPosition == listLength-1)
      {
        // Already on the current entry: clear but save
        if (inputCommand.value)
        {
          historyList[historyPosition] = inputCommand.value;
          ++historyPosition;
          inputCommand.value = "";
        }
      }
    }
  }

  printAnswer = function(a){
      if (a !== undefined) {
      println(a, "normalOutput");
    }
  }

  printError = function(a){
      println(a, "error");
  }

  function println(s, type)
  {
    if((s=String(s)))
    {
      var newdiv = document.createElement("div");
      newdiv.appendChild(document.createTextNode(s));
      newdiv.className = type;
      outputResult.appendChild(newdiv);
      return newdiv;
    }
  }

  function tabcomplete()
  {
    function findstart(s, from, stopAtDot)
    {
     
      function equalButNotEscaped(s,i,q)
      {
        if(s.charAt(i) != q) // not equal go no further
          return false;

        if(i==0) // beginning of string
          return true;

        if(s.charAt(i-1) == '\\') // escaped?
          return false;

        return true;
      }
      var nparens = 0;
      var i;
      for(i=from; i>=0; i--)
      {
        if(s.charAt(i) == ' ')
          break;
        if(stopAtDot && s.charAt(i) == '.')
          break;
        if(s.charAt(i) == ')')
          nparens++;
        else if(s.charAt(i) == '(')
          nparens--;
        if(nparens < 0)
          break;
        if(s.charAt(i) == '\'' || s.charAt(i) == '\"')
        {
          var quot = s.charAt(i);
          i--;
          while(i >= 0 && !equalButNotEscaped(s,i,quot)) {
            i--;
          }
        }
      }
      return i;
    }

      var cursorPosition = inputCommand.selectionEnd;

      if(cursorPosition) {
        var dotpos, spacepos, complete, obj;
        dotpos = findstart(inputCommand.value, cursorPosition-1, true);
        if(dotpos == -1 || inputCommand.value.charAt(dotpos) != '.') {
          dotpos = cursorPosition;
        }
        spacepos = findstart(inputCommand.value, dotpos-1, false);
        if(spacepos == dotpos || spacepos+1 == dotpos || dotpos == cursorPosition)
        {
          if(inputCommand.value.charAt(dotpos) == '(' ||
   (inputCommand.value.charAt(spacepos) == '(' && (spacepos+1) == dotpos))
          {
            var fn,fname;
    var from = (inputCommand.value.charAt(dotpos) == '(') ? dotpos : spacepos;
            spacepos = findstart(inputCommand.value, from-1, false);

            fname = inputCommand.value.substr(spacepos+1,from-(spacepos+1));
    //dump("fname: " + fname + "\n");
            try {
             fn = eval(fname);
            }
            catch(er) {
              return;
            }
            if(fn == undefined) {;
               return;
            }
            if(fn instanceof Function)
            {
              if(!fn.toString().match(/function .+?\(\) +\{\n +\[native code\]\n\}/))
                println(fn.toString().match(/function .+?\(.*?\)/), "tabcomplete");
            }
            return;
          }
          else
            obj = _win;
        }
        else
        {
          var objname = inputCommand.value.substr(spacepos+1,dotpos-(spacepos+1));
          try {
                  obj = eval(objname);
          }
          catch(er) {
            printError(er);
            return;
          }
          if(obj == undefined) {
            return;
          }
        }
        if(dotpos == cursorPosition)
        {
          if(spacepos+1 == dotpos || spacepos == dotpos)
          {
            return;
          }
          complete = inputCommand.value.substr(spacepos+1,dotpos-(spacepos+1));
        }
        else {
          complete = inputCommand.value.substr(dotpos+1,cursorPosition-(dotpos+1));
        }
        var matches = [];
        var bestmatch = null;
        for(var a in obj)
        {
          if(a.substr(0,complete.length) == complete) {
            matches.push(a);
            if(bestmatch == null)
            {
              bestmatch = a;
            }
            else {
              function min(a,b){ return ((a<b)?a:b); }
              var i;
              for(i=0; i< min(bestmatch.length, a.length); i++)
              {
                if(bestmatch.charAt(i) != a.charAt(i))
                  break;
              }
              bestmatch = bestmatch.substr(0,i);
            }
          }
        }
        bestmatch = (bestmatch || "");
        var objAndComplete = (objname || obj) + "." + bestmatch;
        if(matches.length > 1 && (matchNumber == objAndComplete || matches.length <= 10)) {
          printTab("Did you mean", matches.join(', '), "tabcomplete");
          matchNumber = null;
        }
        else if(matches.length > 10)
        {
          println(matches.length + " matches.  Press tab again to see them all", "tabcomplete");
          matchNumber = objAndComplete;
        }
        else {
          matchNumber = null;
        }
        if(bestmatch != "")
        {
          var sstart;
          if(dotpos == cursorPosition) {
            sstart = spacepos+1;
          }
          else {
            sstart = dotpos+1;
          }
          inputCommand.value = inputCommand.value.substr(0, sstart)
                    + bestmatch
                    + inputCommand.value.substr(cursorPosition);
          inputCommand.selectionStart = inputCommand.selectionEnd = cursorPosition + (bestmatch.length - complete.length);
        }
      }
  }

  function printTab(h,s,type){
    var div = println(s, type);
      var head = document.createElement("strong");
      head.appendChild(document.createTextNode(h + ": "));
      div.insertBefore(head, div.firstChild);
  }

  function printQuestion(q)
  {
    println(q, "input");
  }

  runCmd = function(s)
  {
    inputCommand.value = question = s ? s : inputCommand.value;

    if (question == "")
      return;

    historyList[historyList.length-1] = question;
    historyList[historyList.length] = "";
    historyPosition = historyList.length - 1;
    inputCommand.value='';
    printQuestion(question);
    //recalculateInputHeight();
    if (_win.closed) {
      printError("Target window has been closed.");
      return;
    }

    try { ("Shell" in _win) }
    catch(er) {
      printError("cannot access variables in the target window");
      return;
    }

    if (!("Shell" in _win))
      initTarget(); // silent

    setTimeout(Shell.refocus, 0);
    Shell.question = question;
    _win.location.href = "javascript:try{ Shell.printAnswer(eval(Shell.question + String.fromCharCode(10))); } catch(er) { Shell.printError(er); }; setTimeout(Shell.refocus, 0); void 0";
  }  
})();
