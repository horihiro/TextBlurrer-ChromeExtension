# Chrome Extension for blurring text 
![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/mbikojdgkmpjfackcmiliemgmkdkbbcl)
![Chrome Web Store Last Updated](https://img.shields.io/chrome-web-store/last-updated/mbikojdgkmpjfackcmiliemgmkdkbbcl)
![Chrome Web Store Stars](https://img.shields.io/chrome-web-store/stars/mbikojdgkmpjfackcmiliemgmkdkbbcl)
![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/mbikojdgkmpjfackcmiliemgmkdkbbcl)

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

# Limitations
  - These are **experimental** features
    - Input Element blurring
    - Tab title masking
  - The following HTML elements are not supported:
    - HTML Canvas
    - TextArea
  - Web Terminal based on Xterm.js:  
    see [here](./docs/BLUR_ON_XTERMJS.md)
  - Web Editor based on CodeMirror:  
    CodeMirror, which bases GitHub code editor, repairs its own contents automatically after blurring by this extension. Then blurring and repairing are repeated, it causes infinity loop. ([#62](https://github.com/horihiro/TextBlurrer-ChromeExtension/issues/62))

    > [!NOTE]
    > Not limited to CodeMirror, it's possible that an infinity loop and a site freezing happen caused by repeat of blurring and DOM tree keeping when the extension tries to blur text on a site composited by frameworks or components which try to keep DOM tree. 
    > As long as I investigate, lexical is also such a component.

# Dependencies
  - **[jsdiff](https://github.com/kpdecker/jsdiff)**: A JavaScript text differencing implementation (BSD 3-Clause License).

## Change logs

See [CHANGELOG.md](./CHANGELOG.md).
