import { IconArrowRight, IconCode, IconGithub, IconLaunch } from '@arco-design/web-react/icon'
import { useEffect, useState } from 'react'
import schemaLayers from './assets/schema-layers.webp'
import CopyButton from './components/CopyButton'
import Playground from './components/Playground'
import QuickStart from './components/QuickStart'

const repo = 'https://github.com/cjinhuo/thrift-to-json-schema'
const install = 'pnpm add @trasm/thrift-jsma'

export default function App() {
	const [usageVisible, setUsageVisible] = useState(false)
	useEffect(() => {
		const section = document.getElementById('sdk-usage')
		if (!section) return
		const observer = new IntersectionObserver(([entry]) => setUsageVisible(entry.isIntersecting), { threshold: 0.6 })
		observer.observe(section)
		return () => observer.disconnect()
	}, [])

	return (
		<>
			<header className='site-header'>
				<div className='wrap header-inner'>
					<a className='brand' href='#playground' aria-label='Schema Studio 首页'>
						<span className='brand-mark' aria-hidden='true'>
							<i />
						</span>
						Schema Studio
					</a>
					<nav className='primary-nav' aria-label='页面导航'>
						<a href='#playground' aria-current={usageVisible ? undefined : 'location'}>
							演练场
						</a>
						<a href='#sdk-usage' aria-current={usageVisible ? 'location' : undefined}>
							SDK 用法
						</a>
					</nav>
					<a className='github-link' href={repo} target='_blank' rel='noreferrer' aria-label='前往 GitHub 仓库'>
						<IconGithub />
						<span>GitHub</span>
						<IconLaunch />
					</a>
				</div>
			</header>
			<main className='wrap' id='playground'>
				<section className='hero' aria-labelledby='hero-title'>
					<img className='hero-art' src={schemaLayers} alt='' width='1100' height='550' fetchPriority='high' />
					<div className='hero-text'>
						<div className='hero-kicker'>
							<span aria-hidden='true' />
							SDK PLAYGROUND
						</div>
						<h1 id='hero-title'>
							Thrift <span className='sr-only'>转为</span>
							<IconArrowRight className='hero-arrow' /> JSON Schema
						</h1>
						<p>编辑 Thrift 定义，实时生成 JSON Schema，再用样例数据验证约束。</p>
						<div className='install-command'>
							<span className='shell-prompt' aria-hidden='true'>
								$
							</span>
							<code>{install}</code>
							<CopyButton label='复制安装命令' text={install} />
						</div>
					</div>
				</section>
				<Playground />
				<QuickStart />
			</main>
			<footer className='wrap site-footer'>
				<span>
					<IconCode />
					@trasm/thrift-jsma
				</span>
				<a href='https://www.jsonschemavalidator.net/' target='_blank' rel='noreferrer'>
					JSON Schema Validator
					<IconLaunch />
				</a>
			</footer>
		</>
	)
}
