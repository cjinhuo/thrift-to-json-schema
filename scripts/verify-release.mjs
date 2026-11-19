import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execute = promisify(execFile)
const root = resolve(import.meta.dirname, '..')
const changeset = fileURLToPath(import.meta.resolve('@changesets/cli/bin.js'))

test('real release CLIs preserve stable, repeated beta, hooks, publishing, and tag pushing', async (t) => {
	const fixture = await mkdtemp(join(tmpdir(), 'trasm-release-rehearsal-'))
	const repository = join(fixture, 'repository')
	const remote = join(fixture, 'remote.git')
	const documents = new Map()
	const requests = []
	// This test registry implements only npm metadata and attachment operations.
	// Unknown operations return 501 so an unmodelled request cannot silently pass.
	const registry = createServer(async (request, response) => {
		const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
		requests.push({ method: request.method, pathname })
		response.setHeader('content-type', 'application/json')
		if (request.method === 'GET' && pathname === '/-/whoami')
			return response.end(JSON.stringify({ username: 'local-fixture' }))
		if (request.method === 'GET' && pathname === '/-/ping') return response.end('{}')
		if (pathname !== '/release-fixture') {
			response.statusCode = 501
			return response.end(JSON.stringify({ error: 'Registry fixture does not model this operation' }))
		}
		if (request.method === 'GET') {
			const document = documents.get('release-fixture')
			response.statusCode = document ? 200 : 404
			return response.end(JSON.stringify(document ?? { error: 'not_found', reason: 'Package has not been published' }))
		}
		if (request.method === 'PUT') {
			const chunks = []
			for await (const chunk of request) chunks.push(chunk)
			const incoming = JSON.parse(Buffer.concat(chunks).toString())
			const previous = documents.get('release-fixture')
			const versions = { ...previous?.versions, ...incoming.versions }
			documents.set('release-fixture', {
				...previous,
				...incoming,
				versions,
				'dist-tags': { ...previous?.['dist-tags'], ...incoming['dist-tags'] },
				_attachments: { ...previous?._attachments, ...incoming._attachments },
			})
			response.statusCode = 201
			return response.end(
				JSON.stringify({ ok: true, id: 'release-fixture', rev: String(Object.keys(versions).length) })
			)
		}
		response.statusCode = 501
		response.end(JSON.stringify({ error: 'Unsupported method' }))
	})
	await new Promise((resolveListening) => registry.listen(0, '127.0.0.1', resolveListening))
	t.after(async () => {
		await new Promise((resolveClosed) => registry.close(resolveClosed))
		await rm(fixture, { recursive: true, force: true })
	})
	const registryUrl = `http://127.0.0.1:${registry.address().port}/`
	await mkdir(join(repository, 'packages/example'), { recursive: true })
	await mkdir(join(repository, '.changeset'), { recursive: true })
	await symlink(
		join(root, 'node_modules'),
		join(repository, 'node_modules'),
		process.platform === 'win32' ? 'junction' : 'dir'
	)
	const json = (value) => `${JSON.stringify(value, null, 2)}\n`
	await writeFile(
		join(repository, 'package.json'),
		json({ name: 'release-rehearsal', private: true, workspaces: ['packages/*'], packageManager: 'npm@11.0.0' })
	)
	await writeFile(
		join(repository, 'package-lock.json'),
		json({ name: 'release-rehearsal', lockfileVersion: 3, packages: {} })
	)
	await writeFile(
		join(repository, 'packages/example/package.json'),
		json({
			name: 'release-fixture',
			version: '1.0.0',
			main: 'index.js',
			publishConfig: { registry: registryUrl, access: 'public' },
		})
	)
	await writeFile(join(repository, 'packages/example/index.js'), 'module.exports = { value: 42 }\n')
	await writeFile(
		join(repository, '.changeset/config.json'),
		json({
			changelog: ['changesets-toolkit/dist/changelog.js', {}],
			commit: ['changesets-toolkit/dist/commit.js', {}],
			baseBranch: 'main',
			access: 'public',
			updateInternalDependencies: 'patch',
			fixed: [],
			linked: [],
			ignore: [],
		})
	)
	await writeFile(
		join(repository, '.npmrc'),
		`registry=${registryUrl}\n//127.0.0.1:${registry.address().port}/:_authToken=local-fixture\n`
	)
	await writeFile(join(repository, '.gitignore'), 'node_modules\n*.tgz\n.npmrc\n')
	const environment = {
		...process.env,
		PATH: `${join(root, 'node_modules/.bin')}${delimiter}${process.env.PATH}`,
		CHANGESET_READ_REPO_TOKEN: '',
		npm_config_registry: registryUrl,
		NPM_CONFIG_REGISTRY: registryUrl,
		npm_config_userconfig: join(repository, '.npmrc'),
		npm_config_ignore_scripts: 'true',
		npm_config_audit: 'false',
		CI: 'true',
	}
	const run = async (command, args, cwd = repository) => {
		try {
			return await execute(command, args, { cwd, env: environment, timeout: 60_000, maxBuffer: 2_000_000 })
		} catch (error) {
			throw new Error(`${command} ${args.join(' ')} failed\n${error.stdout ?? ''}\n${error.stderr ?? ''}`, {
				cause: error,
			})
		}
	}
	const git = (...args) => run('git', args)
	const version = (...args) =>
		run(process.execPath, [
			fileURLToPath(import.meta.resolve('changesets-toolkit/dist/bin/changeset_version.js')),
			...args,
		])
	const publish = (...args) =>
		run(process.execPath, [
			fileURLToPath(import.meta.resolve('changesets-toolkit/dist/bin/changeset_publish.js')),
			...args,
		])
	const currentVersion = async () =>
		JSON.parse(await readFile(join(repository, 'packages/example/package.json'), 'utf8')).version
	const add = (message) => run(process.execPath, [changeset, 'add', '--patch', 'release-fixture', '--message', message])
	await run('git', ['init', '--bare', remote], fixture)
	await git('init', '-b', 'main')
	await git('config', 'user.name', 'Release Fixture')
	await git('config', 'user.email', 'fixture@example.com')
	await git('config', 'core.hooksPath', '/dev/null')
	await git('add', '.')
	await git('commit', '-m', 'initial fixture')
	await git('remote', 'add', 'origin', remote)
	await git('push', '-u', 'origin', 'main')
	const initialRemote = (await run('git', ['rev-parse', 'main'], remote)).stdout.trim()

	await add('fix: preserve package behavior\nfix: 保持包的使用行为')
	assert.equal((await git('log', '-1', '--format=%s')).stdout.trim(), 'chore(changeset): 🦋 release-fixture:patch')
	await version('--no-git-push')
	assert.equal(await currentVersion(), '1.0.1')
	assert.equal((await run('git', ['rev-parse', 'main'], remote)).stdout.trim(), initialRemote)
	const changelog = await readFile(join(repository, 'packages/example/CHANGELOG.md'), 'utf8')
	assert.match(changelog, /preserve package behavior/)
	assert.match(changelog, /保持包的使用行为/)
	assert.match(changelog, /fixture@example.com/)

	await add('fix: first beta\nfix: 首次预发布')
	await version('--beta')
	assert.equal(await currentVersion(), '1.0.2-beta.0')
	await publish()
	assert.equal(documents.get('release-fixture')['dist-tags'].beta, '1.0.2-beta.0')
	assert.equal(
		(await run('git', ['rev-parse', 'main'], remote)).stdout.trim(),
		(await git('rev-parse', 'HEAD')).stdout.trim()
	)
	assert.match((await run('git', ['tag'], remote)).stdout, /release-fixture@1\.0\.2-beta\.0/)

	await add('fix: repeat beta\nfix: 继续预发布')
	await version('--beta')
	assert.equal(await currentVersion(), '1.0.2-beta.1')
	const tagsBefore = (await git('tag')).stdout
	await publish('--no-git-tag')
	assert.equal((await git('tag')).stdout, tagsBefore)
	assert.equal(documents.get('release-fixture')['dist-tags'].beta, '1.0.2-beta.1')

	await version()
	assert.equal(await currentVersion(), '1.0.2')
	await publish()
	const published = documents.get('release-fixture')
	assert.equal(published['dist-tags'].latest, '1.0.2')
	assert.deepEqual(Object.keys(published.versions).sort(), ['1.0.2', '1.0.2-beta.0', '1.0.2-beta.1'])
	assert.equal(requests.filter((request) => request.method === 'PUT').length, 3)
	assert.match((await run('git', ['tag'], remote)).stdout, /release-fixture@1\.0\.2\n/)
	assert.equal((await git('status', '--porcelain')).stdout, '')
	await assert.rejects(version(), (error) => error.cause?.code === 1)
})
