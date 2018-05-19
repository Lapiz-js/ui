// > .ModuleName "DefaultUIHelpers"
// This module contains a set of default UI tools. It's important to note that
// this module is seperate from the UI module, so it shows the extent of what
// is possible without access to the internals of the UI mdoule. In addition to
// the documentation, the examples folder will provide a lot of guidance in
// using this module.
Lapiz.Module("DefaultUIHelpers", ["UI"], function($L){
  var UI = $L.UI;

  // > attribute:resolver
  // > <tag resolver="$resolver">...</tag>
  // Takes the current tokenizer and the tokenizer assigned and creates a new
  // templator that will be used on all attributes processed after this and all
  // child nodes. By default, resolver is the first attribute evaluated.
  UI.attribute("resolver", function(node, ctx, resolver){
    var templator = $L.Template.Templator(UI.bindState.templator.tokenizer, resolver);
    UI.bindState.templator = templator;
  });

  // > attribute:templator
  // > <tag templator="$templator">...</tag>
  // Takes the current tokenizer and the tokenizer assigned and creates a new
  // templator that will be used on all attributes processed after this and all
  // child nodes. By default, templator is the second attribute evaluated only
  // after resolver.
  UI.attribute("templator", function(node, ctx, templator){
    UI.bindState.templator = templator;
  });

  // > attribute:with
  // > <tag with="$SubCtx">...</tag>
  // Set the render context. This changes the render context for the node and
  // all children of the node. Can be combined with the render tag for reusable
  // sub-views.
  UI.attribute("with", function(node, oldCtx, newCtx){
    UI.bindState.ctx = newCtx;
  });

  // > attribute:if
  // > <htmlNode if="$ctxVal">...</htmlNode>
  // If the attrVal ($ctxVal above) evaluates to false, the node and it's
  // children are removed. If the attribute is a function it will be invoked
  // with no arguments and the return value will be evaluated as a boolean
  UI.attribute("if", function(node, _, attrVal){
    if (typeof(attrVal) === "function") {attrVal = attrVal();}
    node.removeAttribute("if");
    if (!attrVal){
      var parent = node.parentNode;
      parent.removeChild(node);
      UI.bindState.proceed = false;
    }
  });

  // > attribute:ifNot
  // > <htmlNode ifNot="$ctxVal">...</htmlNode>
  // If the attrVal ($ctxVal above) evaluates to true, the node and it's
  // children are removed. If the attribute is a function it will be invoked
  // with no arguments and the return value will be evaluated as a boolean
  UI.attribute("ifNot", function(node, _, attrVal){
    if (typeof(attrVal) === "function") {attrVal = attrVal();}
    node.removeAttribute("ifNot");
    if (attrVal){
      var parent = node.parentNode;
      parent.removeChild(node);
      UI.bindState.proceed = false;
    }
  });

  // > attribute:repeat
  // Takes a collection (array, map or accessor) and repeats the node for every
  // item in the collection.
  /* >
  <ul>
    <li repeat="$people>$name</li>
  </ul>
  */
  // If the collection has Lapiz event wiring (an accessor such as a Dictionary)
  // the collection will automatically stay up to date with additions and
  // removals. To keep the contents up to date, also use live.
  UI.attribute("repeat", function(templateNode, _, collection){
    //TODO: Lapiz.UI.bindState.firstPass
    var templator = UI.bindState.templator;
    $L.assert(collection !== undefined, "Expected collection, got undefined: "+templateNode)
    var insFn, delFn;
    var index = $L.Map();
    var parent = templateNode.parentNode;

    var end = templateNode.ownerDocument.createComment("end of repeat");
    parent.insertBefore(end, templateNode);
    templateNode.removeAttribute("repeat");

    var fn = function(val, key){
      var clone = templateNode.cloneNode(true);
      index[key] = clone;
      UI.bind(clone, val, templator);
      parent.insertBefore(clone, end);
    };
    if (collection.each instanceof Function){
      collection.each(fn);
    } else {
      $L.each(collection, fn);
    }

    if (collection.on !== undefined){
      if ($L.typeCheck.func(collection.on.insert)){
        insFn = function(key, accessor){
          var clone = templateNode.cloneNode(true);
          var keys = accessor.keys;
          var i = keys.indexOf(key);

          if (i === keys.length-1){
              parent.insertBefore(clone, end);
          } else {
            //insert before something
            parent.insertBefore(clone, index[keys[i+1]]);
          }

          index[key] = clone;
          UI.bind(clone, accessor(key));
        };
        collection.on.insert(insFn);
        UI.on.remove(parent, function(){
          collection.on.insert.deregister(insFn);
        });
      }

      if ($L.typeCheck.func(collection.on.remove)){
        delFn = function(key, accessor, oldObj){
          var n = index[key];
          delete index[key];
          n.parentNode.removeChild(n);
        };
        collection.on.remove(delFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.remove.deregister(delFn);
        });
      }

      if ($L.typeCheck.func(collection.on.change) && delFn && insFn){
        chgFn = function(key, accessor, oldVal){
          // I'm not sure this is a good check, it may be indicative of a
          // deeper problem.
          if (index[key] !== undefined) {delFn(key, accessor, oldVal);}
          insFn(key, accessor);
        }
        collection.on.change(chgFn);
        UI.on.remove(parent, function(){
          collection.on.change.deregister(chgFn);
        });
      }
    }

    //node.parentNode.removeChild(node);
    templateNode.remove();
    UI.bindState.proceed = false;
  }); //End Repeat attribute

  // > attribute:live
  // > <htmlNode live>...</htmlNode>
  // > <htmlNode live="$val">...</htmlNode>
  // If no attribute is used, it will default to the context.
  // When the .on.change event fires the template will be updated.
  var _liveNodes = new WeakMap();
  UI.attribute("live", function(node, context, altCtx){
    var ctx = altCtx || context;
    var fn;
    if ( $L.typeCheck.nested(ctx, "on", "change", "func") && !_liveNodes.get(node)){
      _liveNodes.set(node, true);
      fn = function(){
        UI.bind(node);
      };
      ctx.on.change(fn);
      Lapiz.UI.on.remove(node, function(){
        ctx.on.change.deregister(fn);
      });
    }
  });

  UI.attribute({
    // > attribute:click
    // > <htmlNode click="$ctxFn">...</htmlNode>
    // The given function will be called with the node is clicked.
    "click": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Attribute 'Click' expected function in:"+node.outerHTML); }
      UI.bindState.firstPass && node.addEventListener("click", fn);
    },
    // > attribute:display
    // > <htmlNode display="$ctxFn">...</htmlNode>
    // The given function will be called with the node is first displayed.
    "display": function(node, ctx, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Attribute 'display' expected function in:"+node.outerHTML); }
      UI.bindState.firstPass && fn(node,ctx);
    },
    // > attribute:blur
    // > <htmlNode blur="$ctxFn">...</htmlNode>
    // The given function will be called with the node loses focus.
    "blur": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Attribute 'blur' expected function in:"+node.outerHTML); }
      UI.bindState.firstPass && node.addEventListener("blur", fn);
    },
    // > attribute:submit
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the submit event fires.
    "submit": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Attribute 'submit' expected function in:"+node.outerHTML); }
      UI.bindState.firstPass && node.addEventListener("submit", fn);
    },
    // > attribute:change
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the change event fires.
    "change": function(node, _, fn){
      if (typeof(fn) !== "function") { $L.Err.toss("Attribute 'change' expected function in:"+node.outerHTML); }
      UI.bindState.firstPass && node.addEventListener("change", fn);
    },
    // > attribute:isChecked
    // > <htmlNode isChecked="$boolVal">...</htmlNode>
    // Will set the checked attribute. If combined with live, will keep the
    // checked status up to date.
    "isChecked": function(node, ctx, bool){
      node.checked = !!bool;
    }
  });

  function _getForm(node){
    while(node.tagName !== "FORM"){
      node = node.parentNode;
      if (!("tagName" in node)) { new Error("Node not in a form"); }
    }
    return node;
  }

  function _getFormValues (form) {
    var nameQuery = form.querySelectorAll("[name]");
    var i, n, nodeType, val, d;
    var data = $L.Map();
    for(i=nameQuery.length-1; i>=0; i-=1){
      n = nameQuery[i];
      nodeType = n.type;
      if ( nodeType === "checkbox" || nodeType === "radio"){
        if (n.hasAttribute("value")){
          if (!n.checked){
            continue;
          }
          val = n.value;
        } else{
          val = n.checked;
        }
      } else {
        val = n.value;
      }
      if ($L.Map.has(data, n.name)){
        d = data[ n.name ]
        if ($L.typeCheck.arr(d)){
          d.push(val);
        } else {
          data[ n.name ] = [d, val];
        }
      } else {
        data[ n.name ] = val;
      }
    }
    return data;
  }

  // > Lapiz.UI.mediator
  // Mediators are a way to attach generic logic to a view. See
  // [more](ui.js.md#Lapiz.UI.mediator)

  // > Lapiz.UI.mediator.form
  /* >
    <form>
      ...
      <button click="form.formHandler">Go!</button>
    </form>
  */
  // > Lapiz.UI.mediator.form("formHandler", fn(formData, formNode, ctx));
  // The form mediator will search up the node tree until it finds
  // a form node. All elements with a name will be added to the
  // formData. If more than one element has the same name, the value will be
  // returned as a list.
  //
  // Checkboxes and radio buttons will return a boolean by default indicating
  // if they are checked. But if they have a value attribute, they will use that
  // and only include the value if they are checked.
  UI.mediator("form", function(node, ctx, fn){
    var form;
    return function(evt){
      if (form === undefined){
        form = _getForm(node);
      }
      var preventDefault = true;
      var err = false;
      try {
        preventDefault = !fn(_getFormValues(form), form, ctx);
      } catch(e){
        err = e;
      }
      if ( preventDefault && evt && evt.preventDefault){
        evt.preventDefault();
      }
      if (err){
        $L.Err.toss(err);
      }
    };
  });

  // > attribute:hash
  // Just a shorthand for adding hash links so
  // > <a hash="foo">Foo</a>
  // becomes
  // > <a href="#foo">Foo</a>
  var _hash = $L.Map();
  UI.attribute("hash", function(node){
    var hash = node.getAttribute("hash");
    node.removeAttribute("hash");
    node.setAttribute("href", "#" + hash);
  });

  // > Lapiz.UI.hash(hash, fn, ctx)
  // > Lapiz.UI.hash(hash, renderString)
  // Registers a hash handler. When the hash in the url changes to match the
  // given hash the function will be called or the renderString will be passed
  // into render. A hash will be split on "/" as "hash/arg1/arg2/...".
  UI.hash = function(hash, fn, ctx){
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0){
      $L.Err.toss("Hash requires at least one arg");
    }
    var hash = args.splice(0,1)[0];
    var fn = args[0];
    var ctx = args[1];
    //TODO: test this - pass in dict?
    if (args.length === 0){
      Lapiz.each(hash, function(val, key){
        if (Array.isArray(val) && val.length == 2){
          UI.hash(key, val[0], val[1]);
        } else {
          UI.hash(key, val);
        }
      });
      return;
    } else if (typeof(args[0]) === "string"){
      _hash[hash] = function(){
        UI.render.apply(this, args);
      };
    } else if (typeof(args[0]) === "function"){
      _hash[hash] = fn;
    } else {
      return;
    }

    // check if this matches the current hash
    var urlHash = document.location.hash.substr(1).split("/");
    if (hash == urlHash.shift()){
      UI.on.loaded(function(){
        _hash[hash].apply(this, urlHash);
      });
    }
  };

  window.addEventListener("popstate", function(e){
    if (e.target !== undefined && e.target.location !== undefined && e.target.location.hash !== undefined){
      var args = e.target.location.hash.substr(1).split("/");
      var hash = args.shift();
      if (_hash[hash] !== undefined){ _hash[hash].apply(this, args); }
    }
  });

  // > Lapiz.UI.mediator.viewMethod(viewMethodName, func(node, ctx, args...))
  // > Lapiz.UI.mediator.viewMethod(namedFunc(node, ctx, args...))
  // > Lapiz.UI.mediator.viewMethod({"viewMethodName":funcs(node, ctx, args...)...})
  // Useful mediator for attaching generic methods available to views.
  UI.mediator("viewMethod", function viewMethod(node, ctx, methd){
    $L.typeCheck.func(methd, "Mediator viewMethod expects a function: "+node);
    //Todo:
    // - accept multiple view methods
    // - get name from function
    return function innerViewMethod(){
      var args = Array.prototype.slice.call(arguments); // get args
      args.splice(0,0, node, ctx); // prepend original node and ctx
      return methd.apply(this, args);
    };
  });

  //q for query syntax or quick
  var qRe = {
    id: /\(?#(\w+)\)?/,
    cls: /\(?\.(\w+)\)?/g,
    attr: /\[(\w+)=([^\]]*)\]/g
  };

  // > attribute:q
  // Quick method for defining class, id and attributes
  UI.attribute("q", function(node, _, attrVal){
    var cls, attr, id;
    var clsVals = [node.className];
    if (clsVals[0] === ''){ clsVals = []; }

    id = qRe.id.exec(attrVal);
    if (id && node.id === ""){
      node.id = id[1];
    }

    while ( !!(cls = qRe.cls.exec(attrVal)) === true ){
      clsVals.push(cls[1]);
    }
    node.className = clsVals.join(' ');;

    while ( !!(attr = qRe.attr.exec(attrVal)) === true ){
      node.setAttribute(attr[1], attr[2]);
    }

    node.removeAttribute("q");
  });

  // > attribute:view
  // Renders a view. By default uses the current ctx.
  // > <tag click="view.foo">Foo</tag>
  //
  // > Lapiz.UI.mediator.view("foo", "foo > #main");
  // or
  /* >
  Lapiz.UI.mediator.view("foo", function(node, ctx){
    return {
      view: "someview > #string",
      ctx: {"another": "context"}
    };
  });
  */
  UI.mediator("view", function(node, ctx, viewOrGenerator){
    return function(){
      var view;
      var viewCtx;
      if (typeof(viewOrGenerator) === "function" ){
        viewOrGenerator = viewOrGenerator(node, ctx);
      }
      if (typeof(viewOrGenerator) === "string"){
        view = viewOrGenerator;
        viewCtx = ctx;
      } else {
        if (viewOrGenerator.view !== undefined){
          view = viewOrGenerator.view;
          viewCtx = (viewOrGenerator.ctx === undefined) ? viewCtx : viewOrGenerator.ctx;
        } else{
          $L.Err.toss("An invalid view was given or generated");
        }
      }
      UI.render(view, viewCtx);
    };
  });

  // > mediator:resolver
  Lapiz.UI.mediator("resolver", function(node, ctx, resolverFn){
    return resolverFn(node, ctx);
  });

  // > mediator:templator
  Lapiz.UI.mediator("templator", function(node, ctx, templatorFn){
    return templatorFn(node, ctx);
  });

  // > attribute:selectVal
  // For a select box, it checks all the child select options and if it finds
  // one who's value property matches val, it sets it to selected.
  UI.attribute("selectVal", function(node, ctx, val){
    node.removeAttribute("selectVal");
    val = $L.parse.string(val);
    UI.bindState.after(function(){
      var children = node.children;
      $L.each(children, function(child){
        if (child.tagName === "OPTION" && child.value === val){
          child.selected = true;
          return true;
        }
      });
    });
  });

  // > attribute:focus
  // Causes this element to receive focus when a view is rendered
  UI.attribute("focus", function(node, ctx, val){
    UI.on.add(node, function(){
      node.focus();
    });
  });
});
