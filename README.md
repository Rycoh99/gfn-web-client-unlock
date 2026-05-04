<h1 align="center">GeForce NOW web client unlocker</h1>
<p>
</p>

> this userscript unlocks access to 2K/120FPS/10-bit-color on the GeForce NOW web client for operating systems other than Windows
> made specially for Linux/macOS, and/or other Chromium-based browsers lacking official support from NVIDIA

## info

* NVIDIA, on the web client of GeForce NOW, seems to allow 2K/120FPS/10-bit-color only on Windows (not sure about macOS, untested), and only on "officially supported" browsers (Chrome, Microsoft Edge, etc?)
* requires a GeForce NOW subscription/plan which allows 2K/120FPS
* works only for Chromium-based browsers (tested on the most popular ones, with [Violentmonkey](https://violentmonkey.github.io) / [Tampermonkey](https://www.tampermonkey.net))
* you have any questions/issues/ideas? open an issue

## known issues

* streaming might fail entirely on certain browsers, or 10-bit color can look a bit over-saturated/washed on certain browsers, I'd guess this is related to the browser's implementation of certain codecs (I can recommend [Brave](https://brave.com))

## how it works:

* this userscript spoofs certain signals about the browser and operating system to the ones of Google Chrome running on Windows
* these signals are used by NVIDIA to hide/show options such as 2K resolution, 120 FPS and 10-bit color quality

## show your support

give a ⭐️ if this project helped you!
