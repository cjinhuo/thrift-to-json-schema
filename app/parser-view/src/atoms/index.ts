import { atomWithReset, selectAtom } from 'jotai/utils'

interface EditorAtomType {
  goContent: string
}

export const EditorAtom = atomWithReset<EditorAtomType>({
  goContent: '',
})
