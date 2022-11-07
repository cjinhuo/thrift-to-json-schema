export const SplitSchemaColonReg = /([^:]+):(.*)/i

export const SplitSchemaDotReg = /([^.]+).(.*)/i

export const getGroupsWithReg = (str: string, reg = SplitSchemaColonReg) => {
  const res = str.match(reg)
  return res ? [res[1], res[2]] : []
}
