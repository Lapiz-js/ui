
## Lapiz.UI
Lapiz UI is used to render views. Views are built on the default tokenizing engine.

### Views
Views are chunks of html that Lapiz.UI can attach logic to an replace tokens with context values.

#### Tokens
The best place to start is the the Lapiz token system. The built in token system is demarked with a $. If you need to render the dollar sign, either do it through the context or use &amp;#36;.

```js
var ctx = {
  foo: 12,
  bar: {
    glorp; 'Adam'
  }
}
```

```html
<span name="$bar.glorp">$foo</span>
```
will render
```html
<span name="Adam">12</span>
```

One very important note, the rendering system does not use innerHTML, so the exact string value will be rendered. This provides some protection against html injection, but it does not allow html to be purposefully injected. Instead, use nested views.

#### Attributes
```js
Lapiz.UI.attribute(attributeName, fn(node, context, attrVal));
```

Nothing is done with return value. As an example, here is the click attribute that is included in the default helpers of protoUI:
```js
$L.UI.attribute("click", function(node, context, fn){
  if (typeof(fn) !== "function") { throw "Expected function"; }
  node.onclick = fn;
});
```

#### Before
Sometimes it is important that one attribute runs before another. A third argument of before can be passed. This will be the attribute name.
```js
Lapiz.UI.attribute(attributeName, fn(node, context, attrVal), before);
```

#### Render
```js
Lapiz.UI.render("someView > #someId", "anotherView >> selector", context);
```

Lapiz.UI.render takes an arbitrary number of arguments. It requires at least one render string. It can take an arbitrary number of render strings and it optionally takes a context as the last argument.

A render string starts with a view name. This is followed by either ">" or ">>", the first indicating that it should override the contents of the target, the second that it should append to the contents of the target. Finally, there will be a query selector.

When multiple render strings are passed in, the query selector in the first render string is run against the document - because the view will be added to the document when it is rendered. All subsequent selectors will be run against the view.

#### Bind
Bind is the action of binding a context to a node. Generally it should not be called directly, instead use render.
```js
Lapiz.UI.bind(node, ctx, templator);
```

#### BindState
Lapiz.UI.bindState exposes some of the details of the current bind action. It can be used to attach functions that will run after binding is complete, it can cancel binding the rest of the attributes on the current node and provide access to the current templator.

##### Mediators
One special case exists for defining attribute values. These are called mediators. They're a little difficult to describe in words, but they are functionally quite simple:

```
<N A="M.v">
with context C
```

Given context C while parsing node N with an attribute A="M.v", where A is a custom attribute, M is a mediator and v is a value defined on that mediator, it will be invoked as:

A(N, C, M(N, C, v))

The point of this structure is that the mediator can hide some boiler-plate functionality allowing users to extend it by attaching different values (often functions). One example (and the reason this was included in Lapiz) is form handling (which is a part of the default helpers):

```js
function _getForm(node){
  while(node.tagName !== "FORM"){
    node = node.parentNode
    if (!("tagName" in node)) throw "node not in a form";
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

$L.UI.addMediator("form", function(node, ctx, fn){
  var form = _getForm(node);
  return function(){
    fn(_getFormValues(form));
  }
});
```

While that may be a bit complicated, it allows us to easily attach form handlers with:
Lapiz.UI.mediator.form(formHandlerName, fn(formJson));

### Default UI Helpers
There are a number of helpers that ship with protoUI. But it is important to note that these have no special access. In other words, their behavior can be replecated without modifying either Lapiz or protoUI.

#### Form Mediator
```js
Lapiz.UI.mediator.form(handlerName, formHandler(formJson){...});
```

Must be placed inside a form. Will pass the form name-value pairs into the formHandler as json.

#### View Mediator
```js
Lapiz.UI.mediator.view(viewName, view);
Lapiz.UI.mediator.view(viewName, viewGenerator(node, ctx){return view;});
```

The view mediator is used to render a view. A view object should define the template and target. It can also define the context. If the context is not defined in the view, the current context will be used. Another option is to define a view generator. This must return a view object, but it can be generated dynamically. The view generator will recieve the node and context when invoked.

#### ViewMethod Mediator
```js
Lapiz.UI.mediator.viewMethod(methodName, method(node, ctx){...});
```

This is an easy way to attach view specific logic to the UI. When invoked, the method will be passed the node and context.

#### Click Attribute
```html
<button click="$contextMethod">Run Method in Context</button>
<button click="mediator.method">Run Method from mediator</button>
```

Runs some function when a node is clicked. The attribute value must resolve to a function. Commonly paired with the view and form mediators.

#### Repeat
```html
<ul>
  <li repeat="$people">$name</li>
</ul>
```

Takes an object with an accessor interface (dictionary, accessor or sorter) and repeats a node for each item in the list.

#### With
```html
<span with="$person">$name</span>
```

Changes context. Particularly useful when switching to a sub-context. Also useful when paired with 'live'.

#### Live
Wires the node to the context's on.change event. It is possible to pass in an alternate context (such as a sub-context).

#### The Q attribute
The Q is for query and quick. It's a quick way to set data following query syntax.

```html
<span q="#id.class1.class2[attr1=val1][attr2=val2]"></span>
<span id="id" class="class1 class2" attr1="val1" attr2="val2"></span>
```

Tokens can be used as well. For the id or classes, they should be wrapped in parenthesis to avoid conflicting with dot notation in token syntax. The q attribute should not be used to attach custom attributes.

