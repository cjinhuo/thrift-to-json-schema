import { TSchema } from '@sinclair/typebox'

import { BeingRefedArrayPushType, BeingRefedArrayType } from './types'

const initBeingRefedArray = () => {
  const beingRefedArray: BeingRefedArrayType = []
  const resetBeingRefedArray = () => beingRefedArray.length === 0
  const beingRefedArrayPush: BeingRefedArrayPushType = (
    valueType: string,
    fn: ($id: TSchema) => void
  ) => {
    // common.Common => namespace.structName
    // todo 只取后面一个字段可能会有重叠问题，需修复
    const specialChar = '.'
    beingRefedArray.push([
      valueType.includes(specialChar) ? valueType.split(specialChar).pop()! : valueType,
      fn,
    ])
  }
  const getRefedArray = () => beingRefedArray
  return { resetBeingRefedArray, beingRefedArrayPush, getRefedArray }
}

const { resetBeingRefedArray, beingRefedArrayPush, getRefedArray } = initBeingRefedArray()
export { resetBeingRefedArray, beingRefedArrayPush, getRefedArray }
