import {
	IconApps,
	IconBulb,
	IconCheckCircleFill,
	IconCode,
	IconCodeBlock,
	IconDragDotVertical,
	IconExclamationCircle,
	IconFile,
	IconMindMapping,
	IconRefresh,
	IconSafe,
	IconTags,
} from '@arco-design/web-react/icon'
import { parseThriftToTypeBox } from '@trasm/thrift-jsma'
import { type CSSProperties, type KeyboardEvent, lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { type Draft, type Example, type ExampleId, examples, initialDraft } from '../examples'
import CodeEditor from './CodeEditor'
import CopyButton from './CopyButton'

// 第一次打开校验页再加载 TypeBox 编译器，默认转换视图只需要解析器。
const DataValidation = lazy(() => import('./DataValidation'))

const icons = { fields: IconCode, collections: IconApps, references: IconMindMapping, annotations: IconTags }
const tabs = [
	{ id: 'schema', label: 'JSON Schema', icon: IconCodeBlock },
	{ id: 'validation', label: '数据校验', icon: IconSafe },
] as const
type TabId = (typeof tabs)[number]['id']

function parseSource(source: string) {
	if (!source.trim()) return { error: '输入 Thrift 定义后，这里会显示生成的 Schema。' }
	let errorMessage = ''
	try {
		const schema = parseThriftToTypeBox(source, (error) => {
			errorMessage = error instanceof Error ? error.message : String(error)
		})
		if (schema) return { schema, text: JSON.stringify(schema, null, 2) }
	} catch (error) {
		errorMessage = error instanceof Error ? error.message : String(error)
	}
	return { error: errorMessage || '请检查结构名和字段声明。' }
}

export default function Playground() {
	const [example, setExample] = useState<Example>(examples[0])
	const [drafts, setDrafts] = useState<Partial<Record<ExampleId, Draft>>>({})
	const [tab, setTab] = useState<TabId>('schema')
	const [split, setSplit] = useState(50)
	const panes = useRef<HTMLDivElement>(null)
	const draft = drafts[example.id] ?? initialDraft(example)
	// 按示例保存两个输入区的草稿，切换示例时仍能回来继续编辑。
	const updateDraft = useCallback(
		(patch: Partial<Draft>) => {
			setDrafts((prev) => ({ ...prev, [example.id]: { ...(prev[example.id] ?? initialDraft(example)), ...patch } }))
		},
		[example]
	)
	const updateSource = useCallback((source: string) => updateDraft({ source }), [updateDraft])
	const updatePayload = useCallback((payload: string) => updateDraft({ payload }), [updateDraft])
	// 两个视图共用解析结果，切换到校验视图时无需再次计算注解表达式。
	const parsed = useMemo(() => parseSource(draft.source), [draft.source])
	const empty = !draft.source.trim()
	const selectTabByKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		const { key } = event
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return
		event.preventDefault()
		const next = key === 'Home' ? 'schema' : key === 'End' ? 'validation' : tab === 'schema' ? 'validation' : 'schema'
		setTab(next)
		document.getElementById(`tab-${next}`)?.focus()
	}

	return (
		<>
			<section className='examples-section' aria-labelledby='examples-title'>
				<h2 id='examples-title'>示例库</h2>
				<div className='example-grid'>
					{examples.map((item) => {
						const Icon = icons[item.id]
						const selected = item.id === example.id
						return (
							<button
								type='button'
								key={item.id}
								className={`example-card theme-${item.id}`}
								aria-pressed={selected}
								onClick={() => setExample(item)}
							>
								<span className='example-icon'>
									<Icon />
								</span>
								<span className='example-text'>
									<strong>{item.title}</strong>
									<small>{item.subtitle}</small>
								</span>
								{selected && <IconCheckCircleFill className='chosen-icon' />}
							</button>
						)
					})}
				</div>
			</section>
			<section id='workbench' aria-labelledby='workbench-title'>
				<div className='section-heading'>
					<div className='heading-group'>
						<h2 id='workbench-title'>转换工作台</h2>
						<span className={`live-status ${parsed.schema ? '' : empty ? 'waiting' : 'invalid'}`}>
							<i />
							{parsed.schema ? '实时转换' : empty ? '等待输入' : '解析出错'}
						</span>
					</div>
					<button type='button' className='reset-button' onClick={() => updateDraft(initialDraft(example))}>
						<IconRefresh />
						重置示例
					</button>
				</div>
				<div className='workbench-frame'>
					<div className='panes' ref={panes} style={{ '--split': `${split}%` } as CSSProperties}>
						<div className='editor-pane source-pane'>
							<div className='pane-header'>
								<div className='file-name'>
									<IconFile />
									{example.file}
								</div>
								<span className='language-label'>Thrift IDL</span>
							</div>
							<div className='pane-body'>
								<CodeEditor
									key={example.id}
									label='Thrift 源码'
									language='thrift'
									value={draft.source}
									onChange={updateSource}
								/>
							</div>
						</div>
						<div className='split-grip'>
							<IconDragDotVertical />
							<input
								type='range'
								className='grip-input'
								aria-label='Thrift 编辑区宽度'
								aria-valuetext={`${split}%`}
								title='拖动或使用方向键调整宽度'
								min={28}
								max={72}
								value={split}
								onChange={(event) => setSplit(Number(event.target.value))}
								onPointerDown={(event) => {
									event.preventDefault()
									event.currentTarget.focus()
									event.currentTarget.setPointerCapture(event.pointerId)
								}}
								onPointerMove={(event) => {
									const bounds = panes.current?.getBoundingClientRect()
									if (bounds && event.currentTarget.hasPointerCapture(event.pointerId)) {
										const percent = Math.round(((event.clientX - bounds.left) / bounds.width) * 100)
										setSplit(Math.min(72, Math.max(28, percent)))
									}
								}}
							/>
						</div>
						<div className='editor-pane output-pane'>
							<div className='pane-header'>
								<div className='output-tabs' role='tablist' aria-label='输出视图'>
									{tabs.map(({ id, label, icon: Icon }) => (
										<button
											type='button'
											role='tab'
											id={`tab-${id}`}
											key={id}
											aria-controls='workbench-output'
											aria-selected={tab === id}
											tabIndex={tab === id ? 0 : -1}
											onKeyDown={selectTabByKey}
											onClick={() => setTab(id)}
										>
											<Icon />
											{label}
										</button>
									))}
								</div>
								{tab === 'schema' && parsed.text && <CopyButton label='复制 JSON Schema' text={parsed.text} />}
							</div>
							<div className='pane-body' role='tabpanel' id='workbench-output' aria-labelledby={`tab-${tab}`}>
								{parsed.schema ? (
									tab === 'schema' ? (
										<CodeEditor label='JSON Schema 输出' language='json' value={parsed.text} />
									) : (
										<Suspense
											fallback={
												<p className='parse-message' role='status'>
													正在加载校验器…
												</p>
											}
										>
											<DataValidation
												key={example.id}
												example={example}
												schema={parsed.schema}
												payload={draft.payload}
												onChange={updatePayload}
											/>
										</Suspense>
									)
								) : (
									<div className='parse-message' role={empty ? 'status' : 'alert'}>
										<IconExclamationCircle />
										<strong>{empty ? '等待 Thrift 定义' : 'Thrift 解析失败'}</strong>
										<p>{parsed.error}</p>
									</div>
								)}
							</div>
						</div>
					</div>
					<div className='workbench-foot'>
						<span>
							<IconBulb />
							{example.hint}
						</span>
						{tab === 'schema' && parsed.text && (
							<span className='output-lines'>{parsed.text.split('\n').length} 行 JSON</span>
						)}
					</div>
				</div>
			</section>
		</>
	)
}
