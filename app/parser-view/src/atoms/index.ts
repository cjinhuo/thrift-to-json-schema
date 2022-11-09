import { atomWithReset } from 'jotai/utils'

interface EditorAtomType {
  goContent: string
}

export const EditorAtom = atomWithReset<EditorAtomType>({
  goContent: '',
})
