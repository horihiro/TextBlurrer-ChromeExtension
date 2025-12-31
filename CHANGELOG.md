# Change logs
## [0.2.6](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.6)
  - Bug fixes
    - Improve mask positioning for `input` elements by adding 'line-height' and refining top calculation

## [0.2.5](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.5)

  - Bug fixes
    - Improve performance if there are **invisible** (`display: none` or `visibility: hidden`) elements containing target keywords.
  - Chores
    - Typescriptize

## [0.2.4](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.4)

  - New features
    - Support `contentEditable`-enabled elements
  - Bug fixes
    - Fix tab title masking ([#65](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/65))
    - Fix issue with matching empty string ([#67](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/67))
  - Chores
    - Add documentation about priority of the keywords/patterns

## [0.2.3](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.3)

  - Bug fixes
    - Fix tab title masking ([#56](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/56))
    - Fix white-space handling ([#57](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/57))
    - Fix hanging up on sites contain CodeMirror ([#62](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/62))
  - Chores
    - Add documentation about blurring on Xterm.js

## [0.2.2](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.2)

  - Bug fixes
    - Improve performance ([#52](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/52))
    - Fix adding exclusion URL patterns list

## [0.2.1](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.1)

  - Bug fixes
    - Improve performance ([#48](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/48))

## [0.2.0](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.0)

Refactoring blurring logic to improve performance and maintainability.  
From this version, this extension includes [jsdiff](https://github.com/kpdecker/jsdiff)

  - New features
    - Disable blurring on listed sites on [Exclusion URL pattern list](#exclusion-url-list-v020-or-later)
    - Add [Context Menu for adding the blurry keywords](#context-menu-for-adding-keyword-v020-or-later)
    - Add shortcut keys on popup :
      - <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>s</kbd>: applying keywords/url patterns change
      - <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>f</kbd>: removing empty lines in active textarea
  - Bug fixes
    - Improve title masking ([#38](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/38), [#39](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/39))
    - Improve unblurring on updating text node by javascript ([#40](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/40))
    - Improve inputting keywords using RegExp assersions ([#41](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/31))

## [0.1.9](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.9)

  - New features
    - Add **experimental** option to mask title by keywords
  - Bug fixes
    - Improve misalignment of mask position for input element

## [0.1.8](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.8)

  - Bug fixes
    - Fix misalignment of mask position for input element with `box-sizing` set to `border-box` ([#32](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/32))

## [0.1.7](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.7)

  - Bug fixes
    - Fix handling empty line in keyword/pattern list([#29](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/29))

## [0.1.5](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.5)

  - Bug fixes
    - Fix misalignment of mask position([#26](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/26))
    - Improve performance with many keywords/patterns

## [0.1.4](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.4)

  - New features
    - Add a link to [new issue](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/new)
  - Bug fixes
    - Fix logic for getting backgroud color
    - Restore `title` attribute

## [0.1.3](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.3)

  - New features
    - Blur keywords splitted into some elements ([#2](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/2))
    - Show blurred value on mouse over blurred area 
    - Blur value in `input` tag (experimental)  
      :warning:  this cannot detect change by `value` property and javascript
  - Bug fixes
    - Improve performance by change blurring logic
    - Blur keywords in shadow DOM

## [0.1.2](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.2)

  - New features
    - Add warning on popup for RegExp one character matches
  - Bug fixes
    - Improve performance

## [0.1.1](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.1)

  - Bug fixes
    - Make RegExp/Matching Case buttons more clear

## [0.1.0](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.1.0)

  -  New features
    - New Popup UI
      - Add buttons for:
        - Regular Expression ([#3](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/3)) w/ validation
        - Match case

  - Bug fixes
    - `Enabled` toggle button behavior

## [0.0.2-alpha](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.0.2)

First release on [Chrome Web Store](https://chrome.google.com/webstore/detail/text-blurrer/mbikojdgkmpjfackcmiliemgmkdkbbcl).

  - Bug fixes
    - Improve performance

  - Chores
    - Remove unnesessary features
      - server worker
      - `tabs` permission
      - dependency to jQuery

## [0.0.1-alpha](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.0.1)

First release on GitHub

