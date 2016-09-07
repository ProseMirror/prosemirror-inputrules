This module defines a plugin for attaching ‘input rules’ to an editor,
which can react to or transform text typed by the user. It also comes
with a bunch of default rules that can be enabled in this plugin.

@InputRule
@inputRules

The module comes with a number of predefined rules:

@emDash
@ellipsis
@openDoubleQuote
@closeDoubleQuote
@openSingleQuote
@closeSingleQuote
@smartQuotes
@allInputRules

These utility functions take schema-specific parameters and create
input rules specific to that schema.

@wrappingInputRule
@textblockTypeInputRule
@blockQuoteRule
@orderedListRule
@bulletListRule
@codeBlockRule
@headingRule
