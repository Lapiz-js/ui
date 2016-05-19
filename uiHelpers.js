Lapiz.Module("DefaultUIHelpers", ["UI"], function($L){

  // > attribute:if
  // > <htmlNode if="$ctxVal">...</htmlNode>
  // If the attrVal ($ctxVal above) evaluates to false, the node and it's
  // children are removed. If the attribute is a function it will be invoked
  // with no arguments and the return value will be evaluated as a boolean
  $L.UI.attribute("if", function(node, _, attrVal){
    if (typeof(attrVal) === "function") {attrVal = attrVal();}
    node.removeAttribute("if");
    if (!attrVal){
      var parent = node.parentNode;
      parent.removeChild(node);
      $L.UI.bindState.proceed = false;
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
  // removals. To keep thecontents up to date, also use live.
  $L.UI.attribute("repeat", function(node, _, collection){
    var templator = $L.UI.bindState.templator;
    if (collection === undefined){
      throw("Expected collection, got: " + collection);
    }
    var insFn, delFn;
    var index = $L.Map();
    var parent = node.parentNode;

    var end = node.ownerDocument.createComment("end of repeat");
    parent.insertBefore(end, node);
    node.removeAttribute("repeat");

    var nodeTemplate = node.cloneNode(true); // it may be possible to do this without making a copy.
    var fn = function(key, val){
      var clone = nodeTemplate.cloneNode(true);
      index[key] = clone;
      $L.UI.bind(clone, val, templator);
      parent.insertBefore(clone, end);
    };
    if (collection.each instanceof Function){
      collection.each(fn);
    } else {
      $L.each(collection, fn);
    }

    if (collection.on !== undefined){
      if (collection.on.insert !== undefined){
        insFn = function(key, accessor){
          var clone = nodeTemplate.cloneNode(true);
          var keys = accessor.keys;
          var i = keys.indexOf(key);

          if (i === keys.length-1){
              parent.insertBefore(clone, end);
          } else {
            //insert before something
            parent.insertBefore(clone, index[keys[i+1]]);
          }

          index[key] = clone;
          $L.UI.bind(clone, accessor(key));
        };
        collection.on.insert(insFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.insert.deregister(insFn);
        });
      }

      if (collection.on.remove !== undefined){
        delFn = function(key, obj, accessor){
          var n = index[key];
          delete index[key];
          n.parentNode.removeChild(n);
        };
        collection.on.remove(delFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.insert.deregister(delFn);
        });
      }

      if (collection.on.change !== undefined && delFn !== undefined && insFn !== undefined){
        chgFn = function(key, obj, accessor){
          delFn(key, obj, accessor);
          insFn(key, obj, accessor);
        }
        collection.on.change(chgFn);
        Lapiz.UI.on.remove(parent, function(){
          collection.on.change.deregister(chgFn);
        });
      }
    }

    node.parentNode.removeChild(node);
    $L.UI.bindState.proceed = false;
  }); //End Repeat attribute

  // > attribute:live
  // > <htmlNode live>...</htmlNode>
  // > <htmlNode live="$val">...</htmlNode>
  // If no attribute is used, it will default to the context.
  // When the .on.change event fires the template will be updated.
  var _liveNodes = new WeakMap();
  $L.UI.attribute("live", function(node, context, altCtx){
    var ctx = altCtx || context;
    var fn;
    if (ctx.hasOwnProperty("on") && ctx.on.hasOwnProperty("change")  && !_liveNodes.get(node)){
      _liveNodes.set(node, true);
      fn = function(){
        $L.UI.bind(node);
      };
      ctx.on.change(fn);
      Lapiz.UI.on.remove(node, function(){
        ctx.on.change.deregister(fn);
      });
    }
  });

  $L.UI.attribute({
    // > attribute:click
    // > <htmlNode click="$ctxFn">...</htmlNode>
    // The given function will be called with the node is clicked.
    "click": function(node, _, fn){
      if (typeof(fn) !== "function") { throw new Error("Expected function"); }
      node.addEventListener("click", fn);
    },
    // > attribute:display
    // > <htmlNode display="$ctxFn">...</htmlNode>
    // The given function will be called with the node is first displayed.
    "display": function(node, ctx, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      fn(node,ctx);
    },
    // > attribute:blur
    // > <htmlNode blur="$ctxFn">...</htmlNode>
    // The given function will be called with the node loses focus.
    "blur": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("blur", fn);
    },
    // > attribute:submit
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the submit event fires.
    "submit": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("submit", fn);
    },
    // > attribute:change
    // > <htmlNode submit="$ctxFn">...</htmlNode>
    // The given function will be called when the change event fires.
    "change": function(node, _, fn){
      if (typeof(fn) !== "function") { throw "Expected function"; }
      node.addEventListener("change", fn);
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
    var i, n;
    var data = {};
    for(i=nameQuery.length-1; i>=0; i-=1){
      n = nameQuery[i];
      data[ n.name ] = n.value;
    }
    return data;
  }

  // > mediator:form
  /* >
    <form>
      ...
      <button click="form.formHandler">Go!</button>
    </form>
  */
  // > Lapiz.UI.mediator.form("formHandler", fn(formData));
  // The form mediator will search up the node tree until it finds
  // a form node. All elements with a name will be added to the
  // formData.
  $L.UI.mediator("form", function(node, _, fn){
    var form;
    return function(evt){
      if (form === undefined){
        form = _getForm(node);
      }
      if (!fn(_getFormValues(form)) && evt && evt.preventDefault){
        evt.preventDefault();
      }
    };
  });

  var _hash = $L.Map();
  $L.UI.attribute("hash", function(node){
    var hash = node.getAttribute("hash");
    node.removeAttribute("hash");
    node.setAttribute("href", "#" + hash);
  });

  // > Lapiz.UI.hash(hash, fn, ctx)
  // > Lapiz.UI.hash(hash, renderString)
  $L.UI.hash = function(hash, fn, ctx){
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 0){
      throw new Error("Hash requires at least one arg");
    }
    var hash = args.splice(0,1)[0];
    var fn = args[0];
    var ctx = args[1];
    if (args.length === 0){
      Lapiz.each(hash, function(key, val){
        if (Array.isArray(val) && val.length == 2){
          $L.UI.hash(key, val[0], val[1]);
        } else {
          $L.UI.hash(key, val);
        }
      });
    } else if (typeof(args[0]) === "string"){
      _hash[hash] = function(){
        $L.UI.render.apply(this, args);
      };
    } else if (typeof(args[0]) === "function"){
      _hash[hash] = fn;
    }
  };

  window.addEventListener("popstate", function(e){
    if (e.target !== undefined && e.target.location !== undefined && e.target.location.hash !== undefined){
      var args = e.target.location.hash.substr(1).split("/");
      var hash = args.shift();
      if (_hash[hash] !== undefined){ _hash[hash].apply(this, args); }
    }
  });

  $L.UI.on.loaded(function(){
    var args = document.location.hash.substr(1).split("/");
    var hash = args.shift();
    if (_hash[hash] !== undefined){ _hash[hash].apply(this, args); }
  });

  // > Lapiz.UI.mediator.viewMethod
  // Useful mediator for attaching generic methods available to views.
  $L.UI.mediator("viewMethod", function viewMethod(node, ctx, methd){
    //Todo:
    // - accept multiple view methods
    // - get name from function
    return function innerViewMethod(){
      var args = Array.prototype.slice.call(arguments); // get args
      args.splice(0,0, node, ctx); // prepend node and ctx
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
  $L.UI.attribute("q", function(node, _, attrVal){
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
  $L.UI.mediator("view", function(node, ctx, viewOrGenerator){
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
        if (viewOrGenerator.hasOwnProperty("view")){
          view = viewOrGenerator.view;
          if (viewOrGenerator.hasOwnProperty("ctx")){
            viewCtx = viewOrGenerator.ctx;
          }
        }
        throw new Error("An invalid view was given or generated");
      }
      $L.UI.render(view, viewCtx);
    };
  });

  // > attribute:resolver
  Lapiz.UI.mediator("resolver", function(node, ctx, resolverFn){
    return resolverFn(node, ctx);
  });

  // > attribute:selectVal
  $L.UI.attribute("selectVal", function(node, ctx, val){
    node.removeAttribute("selectVal");
    val = $L.parse.string(val);
    $L.UI.bindState.after(function(){
      var children = node.children;
      $L.each(children, function(_, child){
        if (child.tagName === "OPTION" && child.value === val){
          child.selected = true;
          return true;
        }
      });
    });
  });
});
