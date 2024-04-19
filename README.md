# Chrome Extension for blurring text 
This extension can blur specified text/keywords in web pages.

# Demo
## Keyword matching

https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/f33e548c-c360-42fd-9777-dbf89187588b

## Regular Expression matching
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/dbd7d6f7-3879-4ab0-895c-8c6b154fecf2

#### RegExp Validation
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/f7c86192-a407-4497-b4e6-ff1c98f461ca

## Show value on mouseover (v0.1.3 or later)
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/6f3753dd-9031-43df-87af-f9f572f7b758

## Blur value in `input` tag (experimental, v0.1.3 or later)
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/27f2c3b1-ecf0-4a1f-88df-2f6e2b948f06

## Exclusion URL list (v0.2.0 or later)
If you want NOT to blur keywords in specific sites/frames, you can specify URLs of the site in the `Exclusion URL patterns` tab.

![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/7b38cd45-66dd-4021-96a8-e67180e8cc4f)

You can add URLs on the current tab to the list by clicking `+ Add URLs in the current tab` on the popup. 

## Context menu for adding keyword (v0.2.0 or later)

Simple way to add the blurry keyword.

![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/a1182e7f-5462-493b-b561-618863d29fc9)

## Shortcut keys on popup (v0.2.0 or later)

  - <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>s</kbd>: applying keywords/url patterns change (i.e. pressing `Apply` button)
  - <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>f</kbd>: removing empty lines in active textarea

## Mask value in title (experimental, v0.1.9 or later)
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/25c24d50-b478-4e63-9388-20b391046fc6


# Try this
This extension can be installed from [Chrome Web Store](https://chrome.google.com/webstore/detail/text-blurrer/mbikojdgkmpjfackcmiliemgmkdkbbcl).

If you can try a development version, the following steps are needed.

1. get contents of this repository
    1. clone this repository  
      or
    1. download zip file and extract it
1. open `chrome://extensions`
1. enable `Developer mode` and click `Load Unpacked`
    1. Google Chrome  
      ![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/0656fd3d-41da-4f97-a614-da232a3d700d)
    1. Microsoft Edge  
      ![image](https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/44e7f896-9e82-4af1-ae1b-f864097b44c7)
1. select the directory created by cloning at step 1.

# Dependencies
 - **[jsdiff](https://github.com/kpdecker/jsdiff)**: A JavaScript text differencing implementation (BSD 3-Clause License).

# Change logs

## [0.2.1](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.2.1)

  - Bug fixes
    - Improve performance ([#48](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/48)

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

