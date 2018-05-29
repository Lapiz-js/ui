(function($L){
  function tiggerLoad(ui){
    ui.root.dispatchEvent(new Event("DOMContentLoaded", {bubbles: true}));
  }

  $L.Test("UI/loadViews", function(t){
    var ui = $L.UI.fragment("<l-view name='testViewTag'>Test</l-view><div l-view='testViewAttribute'>Foobar</div>");
    $L.UI.defaultHelpers(ui);
    tiggerLoad(ui);
    ui.View("callView", "<span>Hi there</span>")
    ui.CloneView("testViewTag") !== undefined || t.error("testViewTag is not defined")
    ui.CloneView("testViewAttribute") !== undefined || t.error("testViewAttribute is not defined")
    ui.CloneView("callView") !== undefined || t.error("callView is not defined")
  });

  $L.Test("UI/pluralAttr", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><div l-view='test' foo='test'></div>");
    $L.UI.defaultHelpers(ui);
    var hitFoo = false;
    ui.attribute({
      "foo":function(){
        hitFoo = true;
      },
      "bar": function(){}
    })
    tiggerLoad(ui);
    ui.render("test > #main");

    hitFoo || t.error("Did not run 'foo' attribute")
  });

  $L.Test("UI/mediator/form", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><form id='testForm' l-view='testForm' submit='form.testForm'><input type='hidden' name='foo' value='bar' /></form>");
    $L.UI.defaultHelpers(ui);
    var gotData;
    ui.mediator.form(function testForm(data){
      gotData = data;
    });
    tiggerLoad(ui);
    ui.render("testForm > #main");
    // TODO: ui.id("testForm").submit(); // not working - why?
    ui.id("testForm").dispatchEvent(new Event("submit",{}));

    gotData !== undefined && gotData.foo === "bar" || t.error("Did not get expected value");
  });

  $L.Test("UI/mediator/array", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><form id='testForm' l-view='testForm' submit='form.testForm'><input type='hidden' name='foo' value='bar' /></form>");
    $L.UI.defaultHelpers(ui);
    var gotData;
    ui.mediator.form([function testForm(data){
      gotData = data;
    }]);
    tiggerLoad(ui);
    ui.render("testForm > #main");
    // TODO: ui.id("testForm").submit(); // not working - why?
    ui.id("testForm").dispatchEvent(new Event("submit",{}));

    gotData !== undefined && gotData.foo === "bar" || t.error("Did not get expected value");
  });

  $L.Test("UI/mediator/obj", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><form id='testForm' l-view='testForm' submit='form.testForm'><input type='hidden' name='foo' value='bar' /><script src='foo.js'></script></form>");
    $L.UI.defaultHelpers(ui);
    var gotData;
    ui.mediator.form({"testForm": function (data){
      gotData = data;
    }});
    tiggerLoad(ui);
    ui.render("testForm > #main");
    // TODO: ui.id("testForm").submit(); // not working - why?
    ui.id("testForm").dispatchEvent(new Event("submit",{}));

    gotData !== undefined && gotData.foo === "bar" || t.error("Did not get expected value");
  });

  $L.Test("UI/selectVal", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><select l-view='selectTest' selectVal='$val' id='sel'><option value='1'>Apple</option><option value='2'>Banana</option></select>");
    $L.UI.defaultHelpers(ui);
    tiggerLoad(ui);
    ui.render("selectTest > #main");
    ui.id("sel").value === "1" || t.error("Should default to first option");
    ui.render("selectTest > #main", {'val': 2});
    ui.id("sel").value === "2" || t.error("Should be set to ctx value");
  });

  $L.Test("UI/repeat/array", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><div l-view='repeat' repeat='$$' class='repeat'>$$</div>");
    $L.UI.defaultHelpers(ui);
    tiggerLoad(ui);
    ui.render("repeat > #main",[3,1,4]);
    var nodes = ui.id("main").querySelectorAll(".repeat");
    if (nodes.length !== 3){
      t.error("Expected 3 nodes");
      return;
    } 
    nodes[0].innerHTML === "3" || t.error("Expected index 0 to be 3");
    nodes[1].innerHTML === "1" || t.error("Expected index 1 to be 1");
    nodes[2].innerHTML === "4" || t.error("Expected index 2 to be 4");
  });

  $L.Test("UI/repeat/accessor", function(t){
    var ui = $L.UI.fragment("<div id='main'></div><div l-view='repeat'><div repeat='$$' class='repeat'>$$</div></div>");
    $L.UI.defaultHelpers(ui);
    tiggerLoad(ui);
    var dict = $L.Dictionary({
      "A":"apple",
      "B":"bannana",
      "C":"cantaloupe",
      "D":"dates",
    });
    ui.render("repeat > #main", dict);
    var nodes = ui.id("main").querySelectorAll(".repeat");
    nodes.length === 4 || t.error("Expected 4 repeated nodes");

    dict("E", "elderberry");
    nodes = ui.id("main").querySelectorAll(".repeat");
    nodes.length === 5 || t.error("Expected 5 repeated nodes");
  });
})(Lapiz);