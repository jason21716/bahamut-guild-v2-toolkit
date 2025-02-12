import {
	TComment,
	TCore,
	TCoreConfig,
	TCoreConstructor,
	TCoreState,
	TCoreStateComment,
	TCoreStateKey,
	TLibrary,
	TPlugin,
	TPluginConfig,
	TPluginConstructor,
	TPostCommentNewApiResponse,
} from './types'

import BHGV2_AutoRefresh from './plugins/bhgv2-auto-refresh'
import BHGV2_CommentsReverse from './plugins/bhgv2-comments-reverse'
import BHGV2_DarkMode from './plugins/bhgv2-dark-mode'

import pageStyleString from './css/global.css'
import postStyle_post_detail from './css/postDetail.css'
import BHGV2_Rainbow from './plugins/bhgv2-rainbow'
import BHGV2_Dense from './plugins/bhgv2-dense'
import BHGV2_MasterLayout from './plugins/bhgv2-master-layout'
import BHGV2_NotifyOnTitle from './plugins/bhgv2-notify-on-title'
import BHGV2_HighlightMe from './plugins/bhgv2-highlight-me'
import BHGV2_QuickInput from './plugins/bhgv2-quick-input'

declare var nunjucks: any

/** 等待DOM準備完成 */

const BHGV2Core: TCoreConstructor = ({ plugins, library }) => {
	const LOG = (message: string, type: 'log' | 'warn' | 'error' = 'log') => {
		;(console[type] || console.log)(`[巴哈插件2.0] ${message}`)
	}

	const _plugins: TPlugin[] = []
	const _library: Record<string, TLibrary> = {
		...library,
	}
	const _config: TCoreConfig = {}
	const _state: TCoreState = {}

	const CORE: TCore = {
		getConfig: () => _config,
		getConfigByNames: (...names) => {
			return names.reduce<TCoreConfig>((prev, key) => {
				if (_config[key] !== undefined) {
					prev[key] = _config[key]
				}
				return prev
			}, {})
		},
		mutateConfig: (newValue) => {
			_plugins.forEach((plugin) => plugin.onMutateConfig?.(newValue))
			Object.entries(newValue).forEach(([key, value]) => {
				_config[key] = value
			})
		},

		getState: () => _state,
		getStateByNames: (...names) => {
			return names.reduce<TCoreState>((prev, key) => {
				if (_state[key] !== undefined) {
					prev[key] = _state[key] as any
				}
				return prev
			}, {})
		},
		mutateState: (newValue) => {
			_plugins.forEach((plugin) => plugin.onMutateState?.(newValue))
			Object.entries(newValue).forEach(([key, value]) => {
				_state[key as TCoreStateKey] = value as any
			})
		},

		useLibrary: (name, defaultLibraryIfNotFound) => {
			if (_library[name]) return _library[name]

			_library[name] = defaultLibraryIfNotFound
			return _library[name]
		},
		emit: (eventName, payload): boolean => {
			return (
				_plugins
					.map((plugin) =>
						plugin
							?.events
							?.filter(pluginEvent => pluginEvent.eventName === eventName)
							.map(pluginEvent => pluginEvent.onEvent(eventName, payload))
							.reduce((x, y) => x && y)

					)
					.findIndex((result) => result === false) === -1
			)
		},
		log: LOG,
		DOM: {},
		commentsMap: {},
	}

	const _CorePlugin: TPluginConstructor = (core) => {
		const _plugin: TPlugin = {
			pluginName: 'BHGV2Core',
			prefix: 'BHGV2Core',
		}

		_plugin.onMutateState = (newValue) => {
			if (newValue.gsn !== undefined || newValue.sn !== undefined) {
				const oldValue = core.getStateByNames('gsn', 'sn')
				const gsn = newValue.gsn || oldValue.gsn
				const sn = newValue.sn || oldValue.sn

				if (gsn && sn) {
					newValue.postApi = `https://api.gamer.com.tw/guild/v1/post_detail.php?gsn=${gsn}&messageId=${sn}`
					newValue.commentListApi = `https://api.gamer.com.tw/guild/v1/comment_list.php?gsn=${gsn}&messageId=${sn}`
				}
			}

			if (newValue.latestComments && newValue.latestComments.length > 0) {
				const oldValue = core.getStateByNames('gsn', 'sn')
				const gsn = newValue.gsn || oldValue.gsn
				const sn = newValue.sn || oldValue.sn

				const CommentList = core.DOM.CommentList

				const revisedLatestComments = []

				// revisedLatestComments 的存在理由
				// 因為mutateState會將資料往插件傳，所以必須過濾不必要的資料
				// 這裡的邏輯是假如沒法生成element的話，就整個latestComments也不往下傳，以防不必要錯誤

				if (gsn && sn && CommentList) {
					const _createCommentElement = (payload: TComment): HTMLElement => {
						if (!payload.position) {
							payload.position = CORE.DOM.CommentList?.children.length + 1 || 1
						}

						// 生成comment的element
						const newElement: HTMLElement = $(
							nunjucks.render('comment.njk.html', {
								post: {
									id: sn,
									commentCount: 0,
									to: { gsn: gsn },
								},
								comment: {
									...payload,
									text: GuildTextUtil.mentionTagToMarkdown(
										gsn,
										payload.text,
										payload.tags,
										payload.mentions
									),
									time: payload.ctime,
								},
								marked: GuildTextUtil.markedInstance,
								youtubeParameterMatcher: GuildTextUtil.youtubeParameterMatcher,
								user: guildPost.loginUser,
							})
						)[0]
						newElement.classList.add('bhgv2-comment')
						newElement.setAttribute(
							'data-position',
							payload.position.toString()
						)
						const _replyContentUser = newElement.querySelector<HTMLLinkElement>(
							'.reply-content__user'
						)
						if (_replyContentUser) {
							newElement.setAttribute(
								'data-user',
								_replyContentUser.textContent as string
							)
							newElement.setAttribute(
								'data-userid',
								_replyContentUser.href.split('/').pop() as string
							)
						}

						return newElement
					}

					const oldestLatestComment = newValue.latestComments[0]
					const oldestLatestCommentId = parseInt(oldestLatestComment.id)
					let oldCommentIndex = Array.from(CommentList.children).findIndex(
						(e) =>
							parseInt(e.getAttribute('data-csn') as string) >=
							oldestLatestCommentId
					)

					if (oldCommentIndex === -1) {
						oldCommentIndex = CommentList.children.length
					}

					for (
						let newCommentIndex = 0;
						newCommentIndex < newValue.latestComments.length;
						newCommentIndex++
					) {
						const newComment = newValue.latestComments[newCommentIndex]
						const newCommentId = parseInt(newComment.id)

						if (
							newComment.element &&
							core.commentsMap[newComment.id] === undefined
						) {
							newComment.element.classList.add('bhgv2-comment')
							const _replyContentUser =
								newComment.element.querySelector<HTMLLinkElement>(
									'.reply-content__user'
								)
							if (_replyContentUser) {
								newComment.element.setAttribute(
									'data-user',
									_replyContentUser.textContent as string
								)
								newComment.element.setAttribute(
									'data-userid',
									_replyContentUser.href.split('/').pop() as string
								)
							}

							core.commentsMap[newComment.id] = newComment
							revisedLatestComments.push(newComment)
							continue
						}

						const _payload = newComment.payload

						if (!_payload) {
							continue
						}

						while (oldCommentIndex < 9999) {
							if (oldCommentIndex >= CommentList.children.length) {
								newComment.element = _createCommentElement(_payload)
								CommentList.append(newComment.element)
								oldCommentIndex++
								revisedLatestComments.push(newComment)
								core.commentsMap[newComment.id] = newComment
								break
							}

							const oldCommentElement = CommentList.children[oldCommentIndex]
							const oldCommentId = parseInt(
								oldCommentElement.getAttribute('data-csn') as string
							)

							if (oldCommentId === newCommentId) {
								oldCommentIndex++
								break
							} else if (newCommentId < oldCommentId) {
								newComment.element = _createCommentElement(_payload)
								oldCommentElement.insertAdjacentElement(
									'beforebegin',
									newComment.element
								)
								oldCommentIndex++
								revisedLatestComments.push(newComment)
								core.commentsMap[newComment.id] = newComment
								break
							}

							oldCommentIndex++
						}
					}

					newValue.commentsCount = Object.keys(core.commentsMap).length
					newValue.latestComments =
						revisedLatestComments.length > 0 ? revisedLatestComments : undefined
				}
			}
		}

		_plugin.onMutateConfig = (newValue) => {
			const form = core.DOM.ConfigFormContent
			if (!form) {
				return
			}

			Object.keys(newValue).forEach((key: string) => {
				const input = form.querySelector(
					`input[data-config-key='${key}']`
				) as HTMLInputElement
				if (input) {
					switch (input.getAttribute('data-type')) {
						case 'number':
						case 'text':
							input.value = (newValue[key] as string) || ''
							break
						case 'boolean':
							input.checked = (newValue[key] as boolean) || false
							break
					}
				}
			})
		}

		_plugin.css = [pageStyleString]
		if (location && location.href.includes('post_detail.php')) {
			_plugin.css.push(postStyle_post_detail)
		}

		return _plugin
	}

	// ====================================================================================================
	// 主程序
	// ====================================================================================================

	// 初始化 DOM 元件
	const _dom = CORE.DOM

	_dom.Head = document.getElementsByTagName('head')[0]

	_dom.HeadStyle = document.createElement('style')
	_dom.Head.appendChild(_dom.HeadStyle)

	if (_dom.Head) {
		_dom.HeadStyle = document.createElement('style')
		_dom.HeadStyle.innerHTML = pageStyleString
		if (location && location.href.includes('post_detail.php')) {
			_dom.HeadStyle.innerHTML += postStyle_post_detail
		}
		_dom.Head.appendChild(_dom.HeadStyle)
	}

	_dom.Title = document.getElementsByTagName('title')[0] as HTMLElement

	_dom.Body = document.getElementsByTagName('body')[0] as HTMLElement
	_dom.Body.classList.add('bhgv2-body')

	_dom.BHBackground = document.getElementById('BH-background') as HTMLElement
	_dom.BHWrapper = document.getElementById('BH-wrapper') as HTMLElement

	_dom.CommentListOuter = document.getElementsByClassName(
		'webview_commendlist'
	)[0] as HTMLElement
	_dom.CommentListOuter.classList.add('bhgv2-comment-list-outer')

	_dom.CommentList = _dom.CommentListOuter.firstElementChild as HTMLElement
	_dom.CommentList.classList.add('bhgv2-comment-list')

	_dom.EditorContainer = _dom.CommentListOuter.getElementsByClassName(
		'c-reply__editor'
	)[0] as HTMLElement
	_dom.EditorContainer.classList.add('bhgv2-editor-container')

	_dom.EditorContainerReplyContent =
		_dom.EditorContainer.getElementsByClassName(
			'reply-content'
		)[0] as HTMLElement
	_dom.EditorContainerReplyContent.classList.add(
		'bhgv2-editor-container-reply-content'
	)

	_dom.Editor = _dom.EditorContainer.getElementsByClassName(
		'reply-input'
	)[0] as HTMLElement
	_dom.Editor.classList.add('bhgv2-editor')

	const oldEditorTextarea = _dom.Editor.getElementsByTagName(
		'textarea'
	)[0] as HTMLElement

	_dom.EditorTextareaWrapper = document.createElement('div')
	_dom.EditorTextareaWrapper.classList.add('bhgv2-editor-textarea-wrapper')

	_dom.EditorTextareaCarbon = document.createElement('div')
	_dom.EditorTextareaCarbon.classList.add('bhgv2-editor-textarea-carbon')

	_dom.EditorTextareaCarbonText = document.createElement('span')
	_dom.EditorTextareaCarbonText.classList.add(
		'bhgv2-editor-textarea-carbon-text'
	)

	_dom.EditorTextareaCarbonTrailing = document.createElement('span')
	_dom.EditorTextareaCarbonTrailing.classList.add(
		'bhgv2-editor-textarea-carbon-trailing'
	)

	_dom.EditorTextareaCarbon.append(
		_dom.EditorTextareaCarbonText,
		_dom.EditorTextareaCarbonTrailing
	)

	_dom.EditorTextarea = document.createElement('textarea')
	_dom.EditorTextarea.classList.add('content-edit')
	_dom.EditorTextarea.classList.add('bhgv2-editor-textarea')
	_dom.EditorTextarea.setAttribute('placeholder', '留言…')

	_dom.EditorTextareaWrapper.append(
		_dom.EditorTextareaCarbon,
		_dom.EditorTextarea
	)

	oldEditorTextarea.insertAdjacentElement(
		'afterend',
		_dom.EditorTextareaWrapper
	)
	oldEditorTextarea.parentNode?.removeChild(oldEditorTextarea)

	_dom.EditorContainerReplyContentFooter = document.createElement('div')
	_dom.EditorContainerReplyContentFooter.classList.add(
		'bhgv2-editor-container-reply-content-footer'
	)
	_dom.EditorContainerReplyContentFooter.innerHTML = `Enter: 發送　Shift+Enter: 換行　Tab: 快速輸入　/指令　@快速輸入`
	_dom.EditorContainerReplyContent.append(
		_dom.EditorContainerReplyContentFooter
	)

	_dom.EditorContainerFooter = document.createElement('div')
	_dom.EditorContainerFooter.classList.add('bhgv2-editor-container-footer')
	_dom.EditorContainer.appendChild(_dom.EditorContainerFooter)

	_dom.ConfigPanelStatus = document.createElement('div')
	_dom.ConfigPanelStatus.classList.add('bhgv2-config-status')

	_dom.ConfigPanelSwitch = document.createElement('a')
	_dom.ConfigPanelSwitch.classList.add('bhgv2-config-switch')
	_dom.ConfigPanelSwitch.innerHTML = '插件設定'
	_dom.ConfigPanelSwitch.setAttribute('href', '#')

	_dom.EditorContainerFooter.appendChild(_dom.ConfigPanelStatus)
	_dom.EditorContainerFooter.appendChild(_dom.ConfigPanelSwitch)

	_dom.ConfigPanel = document.createElement('div')
	_dom.ConfigPanel.classList.add('bhgv2-config-panel')
	_dom.EditorContainer.append(_dom.ConfigPanel)

	_dom.ConfigForm = document.createElement('form')
	_dom.ConfigForm.classList.add('bhgv2-config-form')
	_dom.ConfigPanel.append(_dom.ConfigForm)

	_dom.ConfigFormContent = document.createElement('div')
	_dom.ConfigFormContent.classList.add('bhgv2-config-form-content')

	_dom.ConfigFormMessage = document.createElement('div')
	_dom.ConfigFormMessage.classList.add('bhgv2-config-form-message')

	_dom.ConfigFormFooter = document.createElement('div')
	_dom.ConfigFormFooter.classList.add('bhgv2-config-form-footer')

	_dom.ConfigFormActions = document.createElement('div')
	_dom.ConfigFormActions.classList.add('bhgv2-config-form-actions')

	_dom.ConfigForm.append(
		_dom.ConfigFormContent,
		_dom.ConfigFormMessage,
		_dom.ConfigFormFooter,
		_dom.ConfigFormActions
	)

	_dom.ConfigFormFooterSaveAsDefault = document.createElement('button')
	_dom.ConfigFormFooterSaveAsDefault.innerHTML = '設為預設值'
	_dom.ConfigFormFooterSave = document.createElement('button')
	_dom.ConfigFormFooterSave.innerHTML = '儲存'
	_dom.ConfigFormFooter.append(
		_dom.ConfigFormFooterSaveAsDefault,
		_dom.ConfigFormFooterSave
	)

	// 初始化每個插件
	;[_CorePlugin, ...plugins].forEach((plugin) => {
		try {
			const _plugin = plugin(CORE)

			// 初始化config
			_plugin.configs?.forEach(({ key, defaultValue }) => {
				_config[key] = defaultValue
				if (defaultValue === undefined) {
					LOG(
						`插件 ${_plugin.pluginName}　的設定 ${key} 的 defaultValue 為空，請設定。`
					)
				}
			})

			_plugins.push(_plugin)
		} catch (e) {
			LOG(`載入插件失敗, ${e.toString()}`, 'error')
		}
	})

	// 將所有插件的css塞進HeadStyle中
	_dom.HeadStyle.innerHTML = _plugins
		.reduce<string[]>((prev, _plugin) => [...prev, ...(_plugin.css || [])], [])
		.join('\n\n')

	// 更新設定版面
	_dom.ConfigFormContent.innerHTML = ''
	_plugins.forEach(({ configs, configLayout }) => {
		if (!configs) {
			return
		}
		const _configLayout = configLayout || [
			configs.map((_config) => _config.key),
		]

		for (const row of _configLayout) {
			const rowElement = document.createElement('div')
			rowElement.classList.add('bhgv2-config-form-row')

			for (const col of row) {
				const configItem = configs.find((_config) => _config.key === col)
				if (!configItem) {
					return
				}

				const colElement = document.createElement('div')
				colElement.classList.add('bhgv2-config-form-col')

				const prefixLabel = document.createElement('span')
				prefixLabel.innerHTML = configItem.prefixLabel || ''

				let inputWrapperElement: HTMLElement = document.createElement('label')

				let inputElement: HTMLElement = document.createElement('div')
				switch (configItem.inputType) {
					case 'number':
					case 'text':
					case 'checkbox':
						inputElement = document.createElement('input')
						inputElement.setAttribute('type', configItem.inputType)
						break

					case 'switch':
						inputWrapperElement = document.createElement('label')
						inputWrapperElement.classList.add('switch')

						inputElement = document.createElement('input')
						inputElement.setAttribute('type', 'checkbox')

						const _slider = document.createElement('span')
						_slider.classList.add('slider')

						inputWrapperElement.append(_slider)
						break
				}

				inputWrapperElement.setAttribute('for', configItem.key)

				inputElement.setAttribute('id', configItem.key)
				inputElement.setAttribute('data-config-key', configItem.key)
				inputElement.setAttribute('data-type', configItem.dataType)
				inputWrapperElement.prepend(inputElement)

				const suffixLabel = document.createElement('span')
				suffixLabel.innerHTML = configItem.suffixLabel || ''

				colElement.append(prefixLabel, inputWrapperElement, suffixLabel)

				rowElement.append(colElement)
			}

			_dom.ConfigFormContent.append(rowElement)
		}
	})

	// 初始化 state (gsn, sn, comments, userInfo)
	_state.gsn = guild.gsn
	if (location && location.href.includes('post_detail.php')) {
		const re =
			/https:\/\/guild\.gamer\.com\.tw\/post_detail\.php\?gsn=(\d*)&sn=(\d*)/gm
		var url = document.URL
		var urlMatch = re.exec(url)

		_state.sn = parseInt(urlMatch?.[2] as string) || undefined
	}
	_state.userInfo = guildPost.loginUser

	// 添加動作給 DOM
	_dom.ConfigPanelSwitch.addEventListener('click', (event) => {
		event.preventDefault()
		_dom.ConfigPanel.classList.toggle('active')
	})

	const _showConfigFormMessage = (message: string) => {
		_dom.ConfigFormMessage.innerHTML = message
		setTimeout(() => {
			_dom.ConfigFormMessage.innerHTML = ''
		}, 2000)
	}

	const _handleSubmitConfigForm = (
		event: MouseEvent,
		options?: { saveAsDefault: boolean }
	) => {
		event.preventDefault()
		const form = CORE.DOM.ConfigForm
		const newConfig = Array.from(
			form.querySelectorAll<HTMLInputElement>('input[data-config-key]')
		).reduce<TCoreConfig>((prev, element) => {
			const key = element.getAttribute('data-config-key')
			if (!key) {
				return prev
			}

			const dataType = element.getAttribute('data-type')
			let value = undefined

			switch (dataType) {
				case 'boolean':
					value = element.checked
					break
				case 'number':
					value = element.valueAsNumber
					break
				case 'text':
					value = element.value
					break
			}

			prev[key] = value

			return prev
		}, {})

		CORE.mutateConfig(newConfig)

		if (options?.saveAsDefault) {
			window.localStorage.setItem(
				'bahamut-guild-v2-toolkit:config',
				JSON.stringify(newConfig)
			)
		}
	}

	CORE.DOM.ConfigFormFooterSave.addEventListener('click', (event) => {
		_handleSubmitConfigForm(event)
		_showConfigFormMessage('已儲存設定')
	})
	CORE.DOM.ConfigFormFooterSaveAsDefault.addEventListener('click', (event) => {
		_handleSubmitConfigForm(event, { saveAsDefault: true })
		_showConfigFormMessage('已設為預設值及儲存設定')
	})

	CORE.DOM.EditorTextarea.addEventListener(
		'keydown',
		(event: KeyboardEvent) => {
			const key = event.key
			const textarea = event.currentTarget as HTMLTextAreaElement

			const canContinue = CORE.emit('textarea-keydown', {
				event,
			})

			if (!canContinue) {
				return
			}

			if (key === 'Enter' && !event.shiftKey) {
				event.preventDefault()

				const content = textarea.value || ''
				if (content.match(/^\s*$/)) {
					console.log('請輸入內容')
					return false
				}

				const { gsn, sn } = CORE.getState()
				if (!gsn || !sn) {
					console.log('GSN或SN是空值！')
					return false
				}

				textarea.setAttribute('disabled', 'true')

				const formData = new FormData()
				formData.append('gsn', gsn.toString())
				formData.append('messageId', sn.toString())
				formData.append('content', content)
				formData.append('legacy', '1')

				const csrf = new Bahamut.Csrf()
				csrf.setCookie()

				fetch('https://api.gamer.com.tw/guild/v1/comment_new.php', {
					method: 'post',
					body: formData,
					headers: csrf.getFetchHeaders(),
					credentials: 'include',
				})
					.then((res) => res.json())
					.then((json: TPostCommentNewApiResponse) => {
						if (json.error) {
							Dialogify.alert(json.error.message)
							return
						}

						CORE.mutateState({
							latestComments: [
								{
									id: json.data.commentId,
									payload: json.data.commentData,
								},
							],
							isUserAction: true,
						})
					})
					.finally(() => {
						textarea.value = ''
						textarea.removeAttribute('disabled')
						textarea.focus()
					})

				return
			}
		}
	)

	CORE.DOM.EditorTextarea.addEventListener('input', (event) => {
		const CarbonText = CORE.DOM.EditorTextareaCarbonText
		if (CarbonText) {
			const textarea = event.currentTarget as HTMLTextAreaElement
			const content = textarea.value

			CarbonText.innerHTML = content.replace(/\n/g, '<br />')
		}

		CORE.emit('textarea-input', {
			event,
		})
	})

	// 觸發一次所有插件的 onMutateConfig
	CORE.mutateConfig(_config)

	// 觸發一次所有插件的 onMutateState
	CORE.mutateState(_state)

	// 讀取預設值
	try {
		const _storedConfigJSON = localStorage.getItem(
			'bahamut-guild-v2-toolkit:config'
		)
		if (_storedConfigJSON) {
			CORE.mutateConfig(JSON.parse(_storedConfigJSON))
		}
	} catch {}

	// 初始化state comments (用Interval等到comment list真的生成好)
	let _initialCommentListInterval: NodeJS.Timer
	_initialCommentListInterval = setInterval(() => {
		const _CommentListOuter = CORE.DOM.CommentListOuter

		if (_CommentListOuter) {
			const commentCount =
				parseInt(
					_CommentListOuter.getAttribute('data-comment-count') as string
				) || 0

			if (commentCount === 0) {
				clearInterval(_initialCommentListInterval)
				return
			}

			const _CommentList = CORE.DOM.CommentList
			if (_CommentList) {
				if (_CommentList.children.length === 0) {
					return
				}

				const _newComments = Array.from(
					_CommentList.children
				).map<TCoreStateComment>((element) => ({
					id: element.getAttribute('data-csn') as string,
					element,
				}))

				CORE.mutateState({
					latestComments: _newComments,
					isInit: true,
				})
			}

			clearInterval(_initialCommentListInterval)
		}
	}, 200)

	return CORE
}

const _waitForElm = (selector: string) => {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector))
		}

		const observer = new MutationObserver((mutations) => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector))
				observer.disconnect()
			}
		})

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		})
	})
}

;(function () {
	let hasTakenOver = false
	_waitForElm('.webview_commendlist .c-reply__editor').then(() => {
		if (!hasTakenOver) {
			BHGV2Core({
				plugins: [
					BHGV2_AutoRefresh,
					BHGV2_CommentsReverse,
					BHGV2_DarkMode,
					BHGV2_Rainbow,
					BHGV2_Dense,
					BHGV2_MasterLayout,
					BHGV2_NotifyOnTitle,
					BHGV2_HighlightMe,
					BHGV2_QuickInput,
				],
				library: {
					jQuery,
					$,
					nunjucks,
					GuildTextUtil,
				},
			})
			hasTakenOver = true
		}
	})
})()
