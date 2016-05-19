(function(){
  Lapiz.UI.View("test","<div id='test'>Test</div>");
  Lapiz.UI.View("test2","<div id='test2' click='$foo'>Test<span display=viewMethod.counter>foo</span><script>/*skips script tags*/</script></div>");

  var c=0;
  Lapiz.UI.mediator.viewMethod("counter", function(){
    c += 1;
  });

  Lapiz.Test("UI/AppendView", function(t){
    Lapiz.UI.render("test >> body");
    var test = Lapiz.UI.id("test");

    test.innerHTML === "Test" || t.error("Expected 'Test'");
    test.remove();

    Lapiz.UI.render("test2 >> body",{
      'foo': function(){}
    });
    Lapiz.UI.id("test2").remove();
  });

  Lapiz.Test("UI/CloneError", function(t){
    var errMsg = false;
    try{
      Lapiz.UI.CloneView("doesNotExist");
    } catch(err){
      errMsg = err.message;
    }

    errMsg === "View doesNotExist is not defined" || t.error("Expected error");
  });

  Lapiz.Test("UI/Attribute", function(t){
    Lapiz.UI.attribute("foo", function(node, ctx, val){}, "bar");
  });

  Lapiz.Test("UI/ViewMethod", function(t){
    Lapiz.UI.mediator.viewMethod("A", function(){});

    Lapiz.UI.mediator.viewMethod({
      "B": function(){},
      "C": function(){},
    });
  });

  Lapiz.Test("UI/MediatorNameErr", function(t){
    var errMsg = false;
    try {
      Lapiz.UI.mediator(12345);
    } catch(err){
      errMsg = err.message;
    }
    errMsg === "Mediator name must be a string" || t.error("Expected error");
  });

  Lapiz.Test("UI/MediatorRedefineErr", function(t){
    var errMsg = false;
    try {
      Lapiz.UI.mediator("viewMethod");
    } catch(err){
      errMsg = err.message;
    }
    errMsg === "Attempting to redefine viewMethod mediator" || t.error("Expected error");
  });

  Lapiz.Test("UI/MediatorPropNameErr", function(t){
    var errMsg = false;
    try {
      Lapiz.UI.mediator.viewMethod(1234, function(){});
    } catch(err){
      errMsg = err.message;
    }
    errMsg === "Mediator property name on viewMethod must be a string, got: number" || t.error("Expected error");
  });

})();