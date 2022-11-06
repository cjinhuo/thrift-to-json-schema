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
