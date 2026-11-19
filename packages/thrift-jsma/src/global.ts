import type { TSchema } from 'typebox'

import type { BeingRefedArrayPushType, BeingRefedArrayType } from './types.js'

const initBeingRefedArray = () => {
	const beingRefedArray: BeingRefedArrayType = []
	const resetBeingRefedArray = () => {
		// 保留旧入口的布尔返回值，同时释放回调持有的 schema。
		const wasEmpty = beingRefedArray.length === 0
		beingRefedArray.length = 0
		return wasEmpty
	}
	const beingRefedArrayPush: BeingRefedArrayPushType = (valueType: string, fn: ($id: TSchema) => void) => {
		// common.Common => namespace.structName
		// todo 只取后面一个字段可能会有重叠问题，需修复
		const name = valueType.slice(valueType.lastIndexOf('.') + 1)
		beingRefedArray.push([name, fn])
	}
	const getRefedArray = () => beingRefedArray
	return { resetBeingRefedArray, beingRefedArrayPush, getRefedArray }
}

const { resetBeingRefedArray, beingRefedArrayPush, getRefedArray } = initBeingRefedArray()

export { beingRefedArrayPush, getRefedArray, resetBeingRefedArray }
