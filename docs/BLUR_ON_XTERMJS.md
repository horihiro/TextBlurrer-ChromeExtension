# How to blur text on Xterm.js
[![](https://github.com/xtermjs/xterm.js/raw/master/logo-full.png)](https://xtermjs.org/)

Xterm.js is a front-end component that lets applications bring fully-featured terminals to their users in the browser[^1]

[^1]: https://github.com/xtermjs/xterm.js/blob/master/README.md

Xterm.js has some types of renderer as followings.
  - WebGL
  - Canvas
  - DOM

From point of view of performance, WebGL renderer is most recommended.
But Text Blurrer cannot blur text rendered by WebGL renderer and Canvas renderer because they draw text on HTML Canvas.

If you want to blur text on Xterm.js-base terminal, you should check which type of renderer is used to render text on the terminal and if the application using Xterm.js has a option to switch the renderer type of Xterm.js

> [!NOTE]
> Switching to DOM renderer for Xterm.js might cause performance issue of the terminal rendering.

## GitHub Codespaces
The terminal on GitHub Codespaces is based on Xterm.js and the default renderer is WebGL renderer.

But it has a option about the terminal rendering.  
By setting `terminal.integrated.gpuAcceleration` to `off`, DOM renderer can be enabled and text on the terminal can be blurred.

## Azure Cloud Shell
It seem that there is no option to switch rendering option.