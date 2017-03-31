/* @flow */

import { makeMap } from 'shared/util'

export const isUnaryTag = makeMap(
  'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
  'link,meta,param,source,track,wbr',
  true
)

// Elements that you can, intentionally, leave open
// (and which close themselves)
// 像colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source这些节点，
// 不会直接包裹同类型的节点，即<td><td>...</td></td>是错误的，
// 所以我们对于这类节点，我们遇到相同类型tag时，应该结束上一个tag，
// 即<td>xxx<td>xxx</td>应该被解析为<td>xxx</td><td>xxx</td>
export const canBeLeftOpenTag = makeMap(
  'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source',
  true
)

// HTML5 tags https://html.spec.whatwg.org/multipage/indices.html#elements-3
// Phrasing Content https://html.spec.whatwg.org/multipage/dom.html#phrasing-content
// 某一些标签，如address,article,aside,base，他们不能被p标签包裹，
// 因此我们在遇到这些标签时需要小心处理，作者把这些标签全都放入到了isNonPhrasingTag这个map对象中。
export const isNonPhrasingTag = makeMap(
  'address,article,aside,base,blockquote,body,caption,col,colgroup,dd,' +
  'details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,' +
  'h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,' +
  'optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,' +
  'title,tr,track',
  true
)
