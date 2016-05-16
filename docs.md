## Lapiz UI Documentation

### Views
When the document loads, any html node in the document with an attribute l-view="VIEWNAME" will be removed from the document and stored as a view

#### Bind
Lapiz.UI.bind(node, ctx, tokenizer)

Args ctx and tokenizer are optional. If not defined they will be inherited. If inheritance fails for tokenizer it will default to Lapiz.Token.Std.tokenizer.

Bind will bind a context to a node using the tokenizer. Bind will use the attributes and mediators.

##### Bind State
Lapis.UI.bindState

This gives extended control over parsing. Bind happens in a single pass, so nothing can access bindState outside of a function stack that starts with bind.

Lapis.UI.bindState.proceed determines if bind should continue parsing attributes of the current node.

Lapis.UI.bindState.next the next node that will be parsed.

Lapis.UI.bindState.tolkenizer is the current tolkenizer being used.

Lapis.UI.bindState.parent the bind state one level up.

#### Render
Lapiz.UI.render(renderStr..., ctx)

Takes any number of render strings, but at least 1 is required. Ctx is optional. If not defined, it will be inherited.

Each render string takes the form "viewName > nodeQuery". The view name is the view to render. If ">" is used, the view will overwrite the contents of its target, if ">>" is used, the view will be appended to it's target. The node query will be used to find a target node. It uses html query syntax. The node query of the first render string will be run against the document. All subsequent queries will be run against the view. So the first render string defines how the view is injected into the document, the rest define how the view is built.

#### CloneView
Lapiz.UI.CloneView(viewName)

Returns a clone of a view. Intended for low level use, but exposed for completeness.

#### Attribute
Lapiz.UI.attribute(name, attrFn(node, ctx, val, tokenizer), after);

The name and attrFn args are required, after is rarely used.

Attributes are applied in a specific order which makes a difference in some cases. For instance, the built-in attribute "if" is the first attribute to run, because if it determines that the node should be removed, no other attributes need to be evaluated. The after attribute allows you to place the attribute at a specific point in the sequence.

The name argument is the name of the attribute and attrFn is the function that will be run. The function is run when the view is bound. Often, the attrFun can ignore the tokenizer.

#### Mediators
Mediators can be difficult to understand. The can wrap specific behavior.

If we have A=M.f on Node N with context C where A is an attribute, M is a mediator and f is a mediator function, what will actually be called is:

A(N, C, M(N, C, f))

An example of a useful mediator the form mediator which gives us something like

click="form.submitPerson"

Where the form mediator extracts the values from the form and passes them into submitPerson.

Another interesting use of the mediators is the viewMethod which does nothing except allows functions to be attached to views. But by following this pattern, it helps clarify the views

```html
<button click="viewMethod.shufflePeople">Shuffle People</button>
```

Without the viewMethod meditor:

```html
<button click="shufflePeople">Shuffle People</button>
```

it is less clear what shufflePeople is.

### id
Lapiz.UI.id(elId, doc)

This is just a wrapper around getElementById. If doc is undefined, it will use document, but you can pass in a document fragment to search.

### Standard Helpers

#### Repeat attribute
Iterates over a collection.
```html
<ul l-view="list">
  <li repeat="$list">$name</li>
</ul>
```

```js
var ctx = {
  list:[
    {name:"Adam", age:31},
    {name:"Stephen", age:32},
    {name:"Lauren", age:29},
  ]
}

Lapiz.UI.render("list > #main", ctx);
```

#### Live attribute
If the ctx has on.change or on.delete properties, live will listen for them and update the node.

#### Click attribute
When the element experiences a click it will call it's function.

#### Form mediator
Provides the values in a form to a mediator function.

#### Hash attribute
The hash attribute is just a helper that replaces itself with an href so

```html
<a hash="foo">Foo</a>
```
Becomes
```html
<a href="#foo">Foo</a>
```

#### Hash method
* Lapiz.UI.hash(name, renderStrings..., ctx)
* Lapiz.UI.hash(name, fn)

The first case is useful to simply render a view when a hash is clicked. This allows for single-page-app navigation.

In the second, a hash will call fn and the values split by /