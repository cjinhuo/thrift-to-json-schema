import { parseThriftToTypeBox } from './parser'

const structString = `
  struct test_struct {
    Color test_color
    map<string, Color> map_enum
  }
  enum Color {
    RED = 1
    GREEN = 2
  }
  `
// enum Color {
//   RED = 1,
//   GREEN = 2,
// }
debugger
const typeBox = parseThriftToTypeBox(structString)
console.log('typeBox', typeBox)
