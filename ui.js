Lapiz.Module("UI", ["Collections", "Events", "Template"], function($L){
  
  var ui = $L.Namespace();
  // > Lapiz.UI
  // Namespace for the UI methods.
  $L.set($L, "UI", ui.namespace);

  var _nodeProp = new WeakMap();
  function _getProperties(node){
    var _props = _nodeProp.get(node);
    if (_props === undefined){
      _props = Lapiz.Map();
      _nodeProp.set(node, _props);
    }
    return _props;
  }

  var _views = $L.Map();

  // _viewAttribute is the attribute that will be used to identify views
  // it is treated as a constant and is only here for DRY
  var _viewAttribute = 'l-view';
  // > l-view
  // Used to create a lapiz view:
  // > <htmlNode l-view="viewName">...</htmlNode>
  // All nodes in the document with this attribute will be cloned and saved and
  // the original will be removed from the document.
  //
  // Any node with the l-view tag will also be cloned as a view, but only the
  // children will be cloned, the node itself will be ommited. The node must
  // have a name attribute
  // > <l-view name="viewName">...</l-view>

  // _loadViews is automatically invoked. It removes any node with the l-view
  // attribute and saves it as a view
  function _loadViews(){
    // clone nodes with l-view attribute
    $L.each(document.querySelectorAll('['+_viewAttribute+']'), function(node){
      _views[node.attributes[_viewAttribute].value] = node;
      node.removeAttribute(_viewAttribute);
      node.remove();
    });
    // clone nodes with l-view tag
    $L.each(document.querySelectorAll(_viewAttribute), function(node){
      var df = document.createDocumentFragment();
      var name = node.attributes["name"].value;
      $L.assert(name !== "", "Got l-view tag without name");
      _views[name] = df;
      var cur;
      for(cur = node.firstChild; cur !== null; cur = cur.nextSibling){
        df.appendChild(cur);
      }
      node.remove();
    });
  }

  // > Lapiz.UI.CloneView(name)
  // Returns an html Node that is a clone of the View.
  ui.meth(function CloneView(name){
    if (_views[name] === undefined){
      throw new Error("View "+name+" is not defined");
    }
    return _views[name].cloneNode(true);
  });

  // > Lapiz.UI.View(name, viewStr)
  // Adds a view that can be rendered or cloned.
  ui.meth(function View(name, viewStr){
    //TODO: this could use some work
    var div = document.createElement("div");
    div.innerHTML = viewStr;
    var node = div.childNodes[0];
    _views[name] = node;
    node.remove();
  });

  var _attributes = $L.Map();
  var _attributeOrder = [];
  // > Lapiz.UI.attribute(name, fn)
  // > Lapiz.UI.attribute(name, fn, before)
  // > Lapiz.UI.attribute(attributes)
  ui.meth(function attribute(name, fn, before){
    if (fn === undefined){
      //define plural
      $L.each(name, function(fn, name){
        Lapiz.UI.attribute(name, fn);
      });
      return;
    }
    $L.typeCheck.string(name, "Attribute name must be a string");
    $L.typeCheck.func(fn, "Second arg to attribute must be a function");
    name = name.toLocaleLowerCase();
    _attributes[name.toLowerCase()] = fn;
    if (before === undefined){
      _attributeOrder.push(name);
    } else {
      var idx = _attributeOrder.indexOf(before);
      if (idx === -1){
        _attributeOrder.push(name);
      } else {
        _attributeOrder.splice(idx, 0, name)
      }
    }
  });

  var _mediators = $L.Map();
  // > Lapiz.UI.mediator(mediatorName,fn)
  // > Lapiz.UI.mediator(mediators)
  ui.meth(function mediator(mediatorName, fn){
    if (typeof mediatorName !== "string"){
      throw new Error("Mediator name must be a string");
    }
    if (_mediators[mediatorName] !== undefined){
      throw new Error("Attempting to redefine "+mediatorName+" mediator");
    }
    var properties = $L.Map();
    _mediators[mediatorName] = {
      handler: fn,
      properties: properties
    };
    // > Lapiz.UI.mediator.mediatorName(propertyName, property)
    // > Lapiz.UI.mediator.mediatorName(properties)
    var registerFn = function(propName, prop){
      if (prop === undefined){
        //defining many with an array
        Lapiz.each(propName, function(val, key){
          properties[key] = val;
        });
        return;
      }
      if (typeof propName !== "string"){
        throw new Error("Mediator property name on "+mediatorName+" must be a string, got: "+(typeof propName));
      }
      properties[propName] = prop;
    };
    Object.defineProperty(Lapiz.UI.mediator, mediatorName, {value: registerFn});
  });

  // _attributeSorter is used to sort the order that attributes are processed
  function _attributeSorter(a,b){
    var ai = _attributeOrder.indexOf(a);
    var bi = _attributeOrder.indexOf(b);
    ai = ai < 0 ? _attributeOrder.length : ai;
    bi = bi < 0 ? _attributeOrder.length : bi;
    return ai-bi;
  }

  // _getAttributeKeys pulls the attribute names from a node and sorts them
  // by _attributeOrder for processing
  function _getAttributeKeys(node){
    var keys = [];
    var i;
    for(i=0; i<node.attributes.length; i++){
      keys.push(node.attributes[i].name);
    }
    keys.sort(_attributeSorter);
    return keys;
  }

  function _inherit(node, property){
    var _props;
    for(;node !== null; node=node.parentNode){
      _props = _nodeProp.get(node);
      if (_props !== undefined && _props[property] !== undefined){
        return _props[property];
      }
    }
  }

  // > Lapiz.UI.bind(node, ctx, templator)
  ui.meth(function bind(node, ctx, templator){
    var cur, i, attrName, attrVal, _props;
    if (node.nodeName.toLowerCase() === "script") { return; }
    var _after = [];

    if ($L.UI.bindState === undefined){
      $L.UI.bindState = $L.Map();
    } else {
      i = $L.Map();
      i.parent = $L.UI.bindState;
      $L.UI.bindState = i;
    }
    $L.UI.bindState.proceed = true;
    $L.UI.bindState.after = function(fn){
      _after.push(fn);
    };

    _props = _getProperties(node);
    if (ctx === undefined){
      ctx = _inherit(node, 'ctx');
    } else {
      _props['ctx'] = ctx;
    }
    if (templator === undefined){
      templator = _inherit(node, 'templator');
      if (templator === undefined){
        templator = $L.Template.Std.templator;
      }
    } else {
      _props['templator'] = templator;
    }
    $L.UI.bindState.templator = templator;


    if (node.nodeType === 3){ //TextNode
      if (_props["template"] === undefined){
        _props["template"] = node.textContent;
      }
      node.textContent = templator(_props["template"], ctx);
    }
    if (node.nodeType === 1){ //Element node
      var attrTemplates = _props['attrTemplates'];
      if (attrTemplates === undefined){
        attrTemplates = $L.Map();
        _props['attrTemplates'] = attrTemplates;
      }
      var attrKeys = _getAttributeKeys(node);
      for(i=0; i<attrKeys.length; i++){
        attrName = attrKeys[i];
        if (attrTemplates[attrName] === undefined){
          attrTemplates[attrName] = node.attributes[attrName].value;
        }
        attrVal = _getAttributeValue(attrTemplates[attrName], ctx, node, $L.UI.bindState.templator);
        if (_attributes[attrName] !== undefined){
          _attributes[attrName](node, ctx, attrVal);
        } else {
          node.attributes[attrName].value = attrVal;
        }
        if ($L.UI.bindState.proceed === false) { break; }
      }
    }

    if (node.nodeType === 1 || node.nodeType === 11){
      for(cur = node.firstChild; cur !== null; cur = $L.UI.bindState.next){
        $L.UI.bindState.next = cur.nextSibling
        $L.UI.bind(cur, ctx, $L.UI.bindState.templator);
      }
    }

    $L.each(_after, function(fn){fn();});

    $L.UI.bindState = $L.UI.bindState.parent;
  });

  var _mediatorRe = /^(\w+)\.(\w+)$/;
  function _getAttributeValue(str, ctx, node, templator){
    var mediatorPattern = _mediatorRe.exec(str);
    var mediator;
    if (mediatorPattern) {
      mediator = _mediators[mediatorPattern[1]];
      if (mediator) {
        //TODO catch if mediatorPattern[2] is not in properties
        return mediator.handler(node, ctx, mediator.properties[mediatorPattern[2]]);
      }
    }
    return templator(str, ctx);
  }

  var _eventNamespace = $L.Namespace(); //Lapiz.UI.on
  ui.set("on", _eventNamespace.namespace);

  var _init = false;
  var _initEvent = $L.SingleEvent();
  $L.Event.linkProperty(_eventNamespace.namespace, "loaded", _initEvent);

  document.addEventListener("DOMContentLoaded", function(){
    _loadViews();
    _init = true;
    _initEvent.fire();

    new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        var l = mutation.removedNodes.length;
        var i;
        for(i=0; i<l; i+=1){
          _handleDeleteNode(mutation.removedNodes[i]);
        }
      });
    }).observe(document.body, { childList: true, subtree:true });
  });

  function _handleDeleteNode(node){
    var _props = _nodeProp.get(node);
    if (_props !== undefined && _props['onRemove'] !== undefined) {
      $L.each(_props['onRemove'], function(fn){ fn(); });
    }
    var l = node.childNodes.length;
    var i;
    for(i=0; i<l; i+=1){
      _handleDeleteNode(node.childNodes[i]);
    }
  }

  function remove(node, fn){
    var _props = _getProperties(node);
    if (_props['onRemove'] === undefined) {
      _props['onRemove'] = [];
    }
    _props['onRemove'].push(fn);
  }
  Object.defineProperty(remove, "deregister", { value: function(node, fn){
    var _props = _getProperties(node);
    if (_props['onRemove'] === undefined) {
      return;
    }
    $L.remove(_props['onRemove'], fn);
  }});

  _eventNamespace.meth(remove);

  function _splitRenderString(str){
    var idx = str.indexOf(">");
    $L.assert(idx > -1, "Render string must contain >");
    var data = $L.Map();
    data.view = str.substr(0,idx).trim();
    data.append = false;
    if (str[idx+1] === ">"){
      idx+=1;
      data.append = true;
    }
    data.selector = str.substr(idx+1).trim();
    return data;
  }

  // > Lapiz.UI.render(renderString..., ctx);
  ui.meth(function render(){
    if (!_init){
      var argsClsr = arguments;
      _initEvent.register(function(){
        $L.UI.render.apply(this, argsClsr);
      });
      return;
    }
    var argsLen = arguments.length;
    var ctx = arguments[argsLen-1];
    var i, target, rend, append, view;
    if (typeof ctx === "string"){
      ctx = {};
    } else {
      argsLen -= 1;
    }
    for(i=0; i<argsLen; i++){
      rend = _splitRenderString(arguments[i]);
      if (i===0){
        target = document.querySelector(rend.selector);
        append = rend.append;
        view = document.createDocumentFragment();
        view.appendChild(Lapiz.UI.CloneView(rend.view));
        Lapiz.UI.bind(view, ctx, Lapiz.Template.Std.templator);
      } else {
        if (rend.selector === ""){
          rend.target = view;
        } else {
          rend.target = view.querySelector(rend.selector);
        }
        if (rend.target === null){
          test = view;
          throw new Error("Query selector could not match "+rend.selector);
        }
        rend.view = $L.UI.CloneView(rend.view);
        $L.UI.bind(rend.view, ctx, Lapiz.Template.Std.templator);
        if (!append){ rend.target.innerHTML = "";}
        rend.target.appendChild(rend.view);
      }
    }
    if (!append){ target.innerHTML = "";}
    target.appendChild(view);
  });

  // > Lapiz.UI.id(elId)
  // > Lapiz.UI.id(elId, doc)
  ui.meth(function id(elId, doc){
    return (doc || document).getElementById(elId);
  });

  // > attribute:resolver
  $L.UI.attribute("resolver", function(node, ctx, resolver){
    var _props = _getProperties(node);
    var templator = $L.Template.Templator($L.Template.Std.tokenizer, resolver);
    _props["templator"] = templator;
    $L.UI.bindState.templator = templator;
  });

});
