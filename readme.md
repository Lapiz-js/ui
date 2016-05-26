## Lapiz.UI

### TODO: html entities
Rendering text to a view will not render tags - which is good (it provides safety and discourages devs from html injection). But it doesn't handle html entities.

It may make sense to add this as an attribute.

###TODO: use named functions
For mediators, maybe attributes.

###TODO: repeat before if?
Maybe repeat should be before if so the if applies to the children, it's easy to wrap the contents in another layer if you want to "if" against a parent attribute

###TODO: Make if work with live
It should preserve the node so and check if it needs to attach it