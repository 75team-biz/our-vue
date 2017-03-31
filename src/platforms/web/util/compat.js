/* @flow */

import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
function shouldDecode (content: string, encoded: string): boolean {
  const div = document.createElement('div')
  div.innerHTML = `<div a="${content}">`
  return div.innerHTML.indexOf(encoded) > 0
}

// #3663
// IE encodes newlines inside attribute values while other browsers don't
// 这是IE上的一个bug, 如果dom节点的属性分多行书写，那么它会把'\n'转义成&#10;,
// 而其它浏览器并不会这么做，因此需要手工处理。
export const shouldDecodeNewlines = inBrowser ? shouldDecode('\n', '&#10;') : false
