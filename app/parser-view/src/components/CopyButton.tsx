import { IconCheck, IconCopy, IconExclamationCircle } from '@arco-design/web-react/icon'
import { useEffect, useRef, useState } from 'react'

export default function CopyButton({ text, label }: { text: string; label: string }) {
	const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null)
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	useEffect(() => () => clearTimeout(timer.current), [])
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text)
			setFeedback('copied')
		} catch {
			setFeedback('failed')
		}
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setFeedback(null), 2200)
	}
	const message = feedback === 'copied' ? '已复制' : '复制失败，请手动选择文本'
	return (
		<span className='copy-control'>
			<button type='button' className='icon-button' aria-label={label} title={label} onClick={copy}>
				{feedback === 'copied' ? <IconCheck /> : feedback === 'failed' ? <IconExclamationCircle /> : <IconCopy />}
			</button>
			<span role='status' className={feedback ? 'copy-feedback' : 'sr-only'}>
				{feedback && message}
			</span>
		</span>
	)
}
