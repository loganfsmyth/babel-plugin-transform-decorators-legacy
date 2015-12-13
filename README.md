

# Babel Legacy Decorator plugin

This is a plugin for Babel 6 that is meant to replicate the old decorator behavior from
Babel 5 in order to allow people to more easily transition to Babel 6 without needing to
be blocked on updates to the decorator proposal or for Babel to re-implement it.


## Best Effort

Beware, this plugin is a best effort to maintain feature parity with Babel 5, but there
are slight differences if you were relied on side-effects between decorators in some
cases.

## Why "legacy"?

Decorators are still only a relatively new proposal, and they are (at least currently) still
in flux. Many people have started to use them in their original form, where each decorator
is essentially a function of the form

    function(target, property, descriptor){}

This form is very likely to change moving forward, and Babel 6 did not wish to support
the older form when it was known that it would change in the future. As such, I created this
plugin to help people transition to Babel 6 without requiring them to drop their decorators
or requiring them to wait for the new proposal update and then update all their code.


## License

MIT (c) 2015
