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

###TODO: Repeat Edge Case
The unbind action is tied to the parent, so if the user renders something new into the parent, the document gets very confused.

###TODO: BUG with live
I had this issue when I put a live attr on a form, every time the live triggered an update, it re-register the form submit. So the form would sumbmit some number of times equal to the total number of changes.

###TODO: Paginating Repeat
Let's say I have a sorted accessor and I want to show the top 10 elements, how
would I do that? What if I wanted to show 5 items per page and I'm on page 3.

###TODO: attrs on render tag
Cannot use 'with' attr in a render tag. Probably can't use any attr in a render
tag.

###TODO: drop q stuff
Maybe move it to another package, but it's not very useful and it's non-
standard.
