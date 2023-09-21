# Chrome Extension for blurring text 
This extension can blur specified text/keywords in web pages.

# Demo
## Keyword matching

https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/f33e548c-c360-42fd-9777-dbf89187588b

## Regular Expression matching
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/dbd7d6f7-3879-4ab0-895c-8c6b154fecf2

#### RegExp Validation
https://github.com/horihiro/TextBlurrer-ChromeExtension/assets/4566555/f7c86192-a407-4497-b4e6-ff1c98f461ca


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

# Change logs

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

## [0.2.0-alpha](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.0.2)

First release on [Chrome Web Store](https://chrome.google.com/webstore/detail/text-blurrer/mbikojdgkmpjfackcmiliemgmkdkbbcl).

  - Bug fixes
    - Improve performance

  - Chores
    - Remove unnesessary features
      - server worker
      - `tabs` permission
      - dependency to jQuery

## [0.1.0-alpha](https://github.com/horihiro/TextBlurrer-ChromeExtension/releases/tag/0.0.1)

First release on GitHub
