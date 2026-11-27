<!-- 由 npm run sync:errors 从 upstream.json 指定的公开源码快照生成。 -->
| 错误码 | 简体中文 | English |
| --- | --- | --- |
| `REGISTRATION_PENDING` | 注册申请正在等待管理员批准。 | Your registration is waiting for administrator approval. |
| `REGISTRATION_REJECTED` | 注册申请已被拒绝或删除，请重新申请。 | Your registration was rejected or deleted. Submit a new request. |
| `IDENTITY_BLACKLISTED` | 此账号或设备已被永久撤销，恢复文件不能解除封禁。 | This account or device is permanently revoked. A recovery file cannot remove a ban. |
| `IDENTITY_CONFLICT` | 此账号已绑定不同的根身份，请使用已有设备授权或正确恢复文件。 | The account is bound to a different root. Authorize from an existing device or use the correct recovery file. |
| `CURRENT_DEVICE` | 不能自助撤销当前设备。 | You cannot revoke the current device yourself. |
| `LAST_DEVICE` | 必须至少保留一台有效设备。 | Keep at least one valid device. |
| `SOCIAL_CONFLICT` | 请先同步最新好友状态后重试。 | Sync the latest friend state and try again. |
| `CLIENT_AUTHORIZATION_STALE` | 授权状态缺失或已过期，聊天已停止。 | Authorization is missing or expired. Chat has stopped. |
| `DEVICE_IDENTITY_REQUIRED` | 请先由可信旧设备授权本设备，或建立首次身份，再登录。旧登录不会提前切换。 | Approve this device with a trusted old device, or create your first identity, before signing in. Your old sign-in stays active until then. |
| `DEVICE_PAIRING_INVALID` | 设备配对已过期、取消或发生冲突，请重新生成二维码。 | Device pairing expired, was cancelled, or conflicts with another exchange. Generate a new QR code. |
| `V5_IDENTITY_INVALID` | 设备身份、签名或授权证明无法验证，请检查设备身份并重试。不会自动重置已验证身份。 | The device identity, signature, or authorization proof could not be verified. Check your device identity and try again. Verified identities will not be reset automatically. |
| `ROOM_IDENTITY_REQUIRED` | 请先通过独立可信渠道核验联系人和房主指纹，并导入有效的房间邀请。 | Verify the contact and room owner fingerprints through an independent trusted channel, then import a valid room invitation. |
| `ROOM_AUTHORIZATION_INVALID` | 房间签名授权、身份或版本无效，请核验房主身份与最新授权。 | The signed room permission, identity, or version is invalid. Verify the owner identity and latest permission. |
| `CLIENT_IDENTITY_CHANGED` | 已验证的身份或房间授权发生冲突，已停止通话。请核对身份和完整授权历史。 | A verified identity or room permission conflicts with trusted records. The call has stopped. Verify the identity and complete permission history. |
| `CLIENT_IDENTITY_EXPIRED` | 设备证书或房间签名授权已到期，已停止通话。请由授权者续期。 | The device certificate or signed room permission has expired. The call has stopped. Ask the authorizer to renew it. |
| `CLIENT_UNEXPECTED` | 操作未完成，请稍后重试 | Something went wrong. Please try again. |
| `CLIENT_UNKNOWN_SERVER_ERROR` | 服务器返回了未识别的错误，请稍后重试 | The server returned an unrecognized error. Please try again. |
| `CLIENT_INVALID_RESPONSE` | 服务器没有返回有效响应 | The server returned an invalid response. |
| `CLIENT_HTTP_FAILURE` | 请求未完成，请稍后重试 | The request could not be completed. Please try again. |
| `CLIENT_NETWORK_UNAVAILABLE` | 网络不可用，请检查网络连接 | You are offline. Check your internet connection. |
| `CLIENT_NETWORK_TIMEOUT` | 连接超时，请稍后重试 | The connection timed out. Please try again. |
| `CLIENT_NETWORK_FAILURE` | 网络连接中断，请稍后重试 | The network connection failed. Please try again. |
| `NETWORK_TIME_REQUIRED` | 请先通过系统时间校验，再登录或授权设备。 | Verify your system time before signing in or approving a device. |
| `CLIENT_INVALID_SERVER_ADDRESS` | 请输入有效的自有服务器地址 | Enter a valid address for your server. |
| `CLIENT_HOSTED_SERVER_UNSUPPORTED` | 此应用只连接自托管 LiveKit | This app only connects to self-hosted LiveKit servers. |
| `CLIENT_INSECURE_SERVER_ADDRESS` | 服务器地址必须使用 HTTPS 或 WSS | The server address must use HTTPS or WSS. |
| `CLIENT_INVALID_SERVER_CONFIGURATION` | 地址未指向兼容的 Chirp 服务，或 API、认证服务暂时不可用 | This address does not provide a compatible Chirp service, or its API or authentication service is unavailable. |
| `CLIENT_SERVER_CONFIGURATION_CHANGED` | 登录、API 或群组服务地址已更改，请重新确认服务器地址 | The sign-in, API, or group service address has changed. Confirm the server address again. |
| `CLIENT_SERVER_NOT_CONFIGURED` | 请先填写并确认服务器地址 | Enter and confirm the server address first. |
| `CLIENT_BROWSER_OPEN_FAILED` | 无法打开注册网页，请检查默认浏览器设置 | The registration page could not be opened. Check your default browser settings. |
| `CLIENT_VERSION_INVALID` | 客户端版本信息无效，请安装有效的新版本后重试 | App version information is invalid. Install a valid updated app and try again. |
| `CLIENT_UPDATE_REQUIRED` | 客户端版本过旧，请自行升级后重试 | This app is too old. Update it and try again. |
| `CLIENT_VERSION_POLICY_UNAVAILABLE` | 服务器版本要求暂时不可用，请稍后重试 | The server version requirements are temporarily unavailable. Try again later. |
| `CLIENT_CONFIG_UNAVAILABLE` | 服务器尚未正确配置认证地址，请联系维护者 | The server authentication address is not configured correctly. Contact the administrator. |
| `DATABASE_UNAVAILABLE` | 服务器数据库暂时不可用，请稍后重试 | The server database is temporarily unavailable. Please try again later. |
| `CLIENT_INVALID_ROOM_LIST` | 服务器返回的房间列表无效 | The server returned an invalid room list. |
| `CLIENT_INVALID_PREFLIGHT` | 服务器返回的入房预校验无效，请重新验证 | The room check is invalid. Please verify again. |
| `CLIENT_INVALID_ADMISSION` | 服务器返回的房间或入房安全策略不匹配 | The room or its security policy does not match the request. |
| `CLIENT_INVALID_JOIN_SEQUENCE` | 入房序列无效，请重新登录 | The room entry sequence is invalid. Please sign in again. |
| `CLIENT_JOIN_SEQUENCE_EXHAUSTED` | 入房序列已用尽，请重新登录 | The room entry sequence is exhausted. Please sign in again. |
| `CLIENT_LEAVE_FAILED` | 离房请求未完成 | The request to leave the room did not complete. |
| `CLIENT_INVALID_LOGIN_CALLBACK` | 登录回调地址不正确，请重试 | The sign-in callback is invalid. Please try again. |
| `CLIENT_LOGIN_VERIFICATION_FAILED` | 登录校验不匹配或已失效，请重新登录 | Sign-in verification failed or expired. Please sign in again. |
| `CLIENT_SECURE_LOGIN_FAILED` | 无法创建安全登录请求 | A secure sign-in request could not be created. |
| `CLIENT_LOCAL_UNLOCK_FAILED` | 未能通过本机验证。请重试或使用通行密钥重新登录。 | Device verification failed. Try again or sign in with your passkey. |
| `RESUMPTION_PROOF_INVALID` | 本次解锁请求未通过验证，请重试。 | This unlock request could not be verified. Try again. |
| `CLIENT_INVALID_LOGIN_SESSION` | 服务器返回的登录信息无效 | The server returned invalid sign-in information. |
| `CLIENT_LOGIN_INCOMPLETE` | 本次登录未完成或已失效，请重新认证 | Sign-in did not complete or has expired. Please sign in again. |
| `CLIENT_LOGIN_EXPIRED` | 登录已到期，请重新使用 Passkey 认证 | Your session has expired. Please sign in again with your passkey. |
| `CLIENT_LOGIN_CANCELLED` | 已取消登录，可以重新认证。 | Sign-in was cancelled. You can try again. |
| `CLIENT_INVALID_DEVICE_AUTHORIZATION` | 服务器返回的扫码登录信息无效，请重试 | The QR sign-in information is invalid. Please try again. |
| `CLIENT_DEVICE_LOGIN_UNSUPPORTED` | 服务器暂不支持扫码登录，请使用 Passkey 登录或联系管理员 | The server does not support QR sign-in. Use your passkey or contact the administrator. |
| `CLIENT_DEVICE_REQUEST_FAILED` | 服务器没有创建有效的扫码请求 | The server could not create a valid QR sign-in request. |
| `CLIENT_DEVICE_STATUS_INVALID` | 扫码登录状态无效 | The QR sign-in status is invalid. |
| `CLIENT_QR_GENERATION_FAILED` | 无法生成二维码，请重试 | The QR code could not be generated. Please try again. |
| `CLIENT_CALL_BUSY` | 正在处理通话，请稍后再试 | A call operation is in progress. Please try again shortly. |
| `CLIENT_SECURE_TRANSPORT_MISSING` | 客户端缺少必需的安全传输支持 | Required secure transport support is missing from this client. |
| `CLIENT_MICROPHONE_PERMISSION_REQUIRED` | 需要麦克风权限才能加入语音 | Microphone access is required to join a voice room. |
| `CLIENT_LOCAL_ENCRYPTION_FAILED` | 本地加密初始化失败 | Local audio encryption could not be initialized. |
| `CLIENT_MICROPHONE_UPDATE_FAILED` | 无法更新麦克风，已离开房间，请重新加入 | The microphone could not be updated. You have left the room; please rejoin. |
| `CLIENT_AUDIO_PRESET_BUSY` | 正在更新通话，请稍后切换音频预设 | The call is being updated. Try changing the audio preset shortly. |
| `CLIENT_AUDIO_CONTROL_UNAVAILABLE` | 当前设备暂不支持音频控制。 | Audio controls are unavailable on this device. |
| `CLIENT_AUDIO_CONTROL_BUSY` | 音频操作尚未完成，请稍后重试。 | Wait for the current audio operation to finish. |
| `CLIENT_AUDIO_DEVICE_CHANGE_FAILED` | 无法切换音频设备，请检查设备连接。 | Could not change the audio device. Check its connection. |
| `CLIENT_MICROPHONE_TEST_FAILED` | 麦克风测试未完成，请停止后重试。 | The microphone test could not finish. Stop it and try again. |
| `CLIENT_AUDIO_SERVICES_RESET` | 系统音频服务已重置，请重新加入语音。 | System audio services were reset. Rejoin the call. |
| `CLIENT_AUDIO_DECRYPTION_RECOVERY_FAILED` | 音轨持续无法解密，请重新加入语音。 | Audio decryption could not recover. Rejoin the call. |
| `CLIENT_AUDIO_PRESET_RECOVERY_FAILED` | 音频预设切换与恢复失败，已离开房间，请重新加入 | The audio preset could not be changed or restored. You have left the room; please rejoin. |
| `CLIENT_SECURE_CONNECTION_NOT_READY` | 安全连接尚未就绪，麦克风保持暂停 | The secure connection is not ready. Your microphone remains paused. |
| `CLIENT_MICROPHONE_ENCRYPTOR_NOT_READY` | 麦克风加密器未就绪 | The microphone encryptor is not ready. |
| `CLIENT_LOCAL_TRACK_UNENCRYPTED` | 本地音轨未启用端到端加密 | End-to-end encryption is not enabled on the local audio track. |
| `CLIENT_REMOTE_TRACK_UNENCRYPTED` | 已拒绝未端到端加密的音轨 | An audio track without end-to-end encryption was rejected. |
| `CLIENT_VOICE_DISCONNECTED` | 语音连接已断开，请重新加入 | The voice connection was lost. Please rejoin. |
| `CLIENT_VOICE_CONNECTION_FAILED` | 无法建立语音连接，请稍后重新加入 | The voice connection could not be established. Please try joining again. |
| `CLIENT_SECURE_CONNECTION_RECOVERY_FAILED` | 无法恢复安全连接，请重新加入 | The secure connection could not be restored. Please rejoin. |
| `CLIENT_AUDIO_ENCRYPTION_FAILED` | 音频加密组件失败，请重新加入 | The audio encryption component failed. Please rejoin. |
| `CLIENT_AUDIO_ENCRYPTION_UNKNOWN` | 无法确认音频加密状态，请重新加入 | Audio encryption could not be verified. Please rejoin. |
| `CLIENT_APPLE_AUDIO_UNAVAILABLE` | 当前音频策略不允许 Apple 系统处理，请选择 WebRTC 回声消除＋RNNoise | Apple audio processing is unavailable with the current audio policy. Select WebRTC echo cancellation + RNNoise. |
| `CLIENT_AUDIO_PRESET_UNCONFIRMED` | 未能确认所选音频预设已生效，请重新加入或选择另一预设 | The audio preset could not be verified. Rejoin the room or select another preset. |
| `CLIENT_NOISE_SUPPRESSION_FAILED` | RNNoise 降噪失败，已停止发送麦克风声音，请重新加入房间 | RNNoise failed. Microphone transmission has stopped; please rejoin. |
| `CLIENT_NOISE_INITIALIZATION_FAILED` | RNNoise 降噪初始化失败，已停止发送麦克风声音 | RNNoise could not be initialized. Microphone transmission has stopped. |
| `CLIENT_NOISE_FORMAT_INVALID` | RNNoise 音频格式异常，已停止发送麦克风声音，请重新加入房间 | RNNoise received an unsupported audio format. Microphone transmission has stopped; please rejoin. |
| `CLIENT_NOISE_PROCESSING_FAILED` | RNNoise 音频处理失败，已停止发送麦克风声音，请重新加入房间 | RNNoise could not process audio. Microphone transmission has stopped; please rejoin. |
| `CLIENT_AUDIO_PROCESSING_FAILED` | 麦克风音频处理失败，已停止发送声音，请重新加入房间 | Microphone audio processing failed. Transmission has stopped; please rejoin the room. |
| `CLIENT_GROUP_STATE_CHANGED` | 安全群组状态已变化，请重新加入 | The secure group has changed. Please rejoin. |
| `CLIENT_GROUP_UNAVAILABLE` | 群组协调服务暂时不可用，已停止语音 | Secure group coordination is unavailable. Voice transmission has stopped. |
| `CLIENT_INVALID_GROUP_RESPONSE` | 群组服务响应无效 | The secure group service returned an invalid response. |
| `CLIENT_GROUP_IDENTITY_INVALID` | 安全群组身份或客户端签名验证失败 | The secure group identity or client signature could not be verified. |
| `CLIENT_GROUP_REQUEST_REJECTED` | 群组服务拒绝请求，请重新加入 | The secure group service rejected the request. Please rejoin. |
| `CLIENT_GROUP_LEASE_EXPIRED` | 安全连接授权已到期，已停止语音，请重新加入 | Secure connection authorization has expired. Voice transmission has stopped; please rejoin. |
| `CLIENT_GROUP_CONNECTION_LOST` | 群组协调连接中断，已停止语音 | The secure group connection was lost. Voice transmission has stopped. |
| `CLIENT_GROUP_MEMBERS_UNVERIFIED` | 暂时无法验证群组成员，已停止语音 | Group members cannot be verified. Voice transmission has stopped. |
| `CLIENT_GROUP_PROTOCOL_MISMATCH` | 群组安全协议不匹配 | The secure group protocol does not match. |
| `CLIENT_PREVIOUS_GROUP_ACTIVE` | 上一轮安全连接尚未结束，请稍后重新加入 | The previous secure connection is still closing. Please rejoin shortly. |
| `CLIENT_GROUP_MEMBERSHIP_LOST` | 当前设备已不在安全群组中，请重新加入 | This device is no longer in the secure group. Please rejoin. |
| `CLIENT_GROUP_AUTHORIZATION_LOST` | 无法恢复群组成员授权，请重新加入 | Group membership authorization could not be restored. Please rejoin. |
| `CLIENT_GROUP_CONFIRMATION_MISMATCH` | 群组密钥确认不一致，已停止语音 | Group key confirmation does not match. Voice transmission has stopped. |
| `CLIENT_GROUP_LEASE_RESPONSE_EXPIRED` | 安全连接授权响应已过期 | The secure connection authorization response has expired. |
| `CLIENT_GROUP_UPDATE_TIMED_OUT` | 安全群组更新超时，请重新加入 | The secure group update timed out. Please rejoin. |
| `CLIENT_GROUP_CRYPTO_FAILED` | 安全群组加密操作失败，已停止语音，请重新加入 | A secure group encryption operation failed. Voice transmission has stopped; please rejoin. |
| `CLIENT_INVALID_MEDIA_LEASE` | 服务器返回的媒体授权期限无效 | The server returned an invalid media authorization lifetime. |
| `CLIENT_CHAT_TEXT_TOO_LONG` | 每条消息最多 4096 UTF-8 字节，请缩短内容 | Messages can contain up to 4096 UTF-8 bytes. Please shorten your message. |
| `CLIENT_CHAT_NOT_READY` | 安全连接未就绪或消息内容无效 | The secure connection is not ready or the message is invalid. |
| `CLIENT_CHAT_PACKET_TOO_LONG` | 消息过长，请缩短内容 | The message is too long. Please shorten it. |
| `CLIENT_CHAT_PREPARATION_FAILED` | 消息内容无效或过长，请缩短内容后重试 | The message is invalid or too long. Shorten it and try again. |
| `CLIENT_CHAT_SEND_FAILED` | 消息发送未完成，可能未送达；请在安全连接恢复后手动重新发送 | The message may not have been delivered. Send it again after the secure connection is restored. |
| `ATTACHMENT_INVALID` | 附件信息、格式或完整性校验失败。 | The attachment format or integrity check is invalid. |
| `ATTACHMENT_UNAVAILABLE` | 附件已失效，或不属于本次入房。 | This attachment expired or belongs to another room visit. |
| `ATTACHMENT_QUOTA` | 附件大小或缓存配额已达上限。图片最多 20 MiB，文件最多 100 MiB。 | The attachment or storage limit was reached. Images: 20 MiB; files: 100 MiB. |
| `ATTACHMENT_CONFLICT` | 附件上传状态已改变，请重新发送。 | The upload state changed. Please send the attachment again. |
| `ATTACHMENT_PENDING` | 附件尚未上传完成。 | The attachment is still uploading. |
| `ATTACHMENT_CANCELLED` | 发送方已取消此附件。 | The sender cancelled this attachment. |
| `ATTACHMENT_EXPIRED` | 附件已过期，请让发送方重新选择文件发送。 | This attachment expired. Ask the sender to select and send the file again. |
| `ATTACHMENT_INTEGRITY` | 附件完整性校验失败，无法继续传输或打开。 | Attachment integrity verification failed. Transfer and opening are blocked. |
| `ATTACHMENT_BUSY` | 附件传输繁忙，请稍后重试。 | Attachment transfers are busy. Try again shortly. |
| `ATTACHMENTS_UNAVAILABLE` | 服务器尚未启用附件功能。 | Attachments are not enabled on this server. |
| `CLIENT_ATTACHMENT_CACHE_FAILED` | 附件缓存无法读写或清理，请检查可用空间。 | Attachment storage could not be accessed or cleared. Check available disk space. |
| `CLIENT_ATTACHMENT_TRANSFER_FAILED` | 附件处理或传输失败，请重试。 | The attachment could not be processed or transferred. Please try again. |
| `CLIENT_PASSWORD_TOO_LONG` | 密码输入过长，请重新输入 | The password is too long. Please enter it again. |
| `CLIENT_INVALID_MEMBER_PROFILES` | 成员资料无效，请稍后重试 | The member profiles are invalid. Please try again later. |
| `AVATAR_TOO_LARGE` | 头像图片须小于 5 MB | Your avatar image must be smaller than 5 MB. |
| `AVATAR_INVALID` | 图片无效，请选择其他静态图片 | This image is invalid. Choose another still image. |
| `AVATAR_DIMENSIONS_EXCEEDED` | 图片尺寸过大，请缩小后重试 | The image dimensions are too large. Resize it and try again. |
| `AVATAR_FORMAT_UNSUPPORTED` | 请上传静态 JPEG 或 PNG 图片 | Upload a still JPEG or PNG image. |
| `AVATAR_BUSY` | 头像处理繁忙，请稍后重试 | Avatar processing is busy. Please try again shortly. |
| `INVALID_DISPLAY_NAME` | 昵称须为 1–80 个字符，不能包含控制字符 | Use 1–80 characters without control characters for your nickname. |
| `MEMBER_NOT_FOUND` | 成员资料或头像不存在 | This member profile or avatar is unavailable. |
| `UNAUTHORIZED` | 登录已失效、到期或已在其他设备登录，请重新认证 | Your session is invalid, expired, or active on another device. Please sign in again. |
| `MEMBER_DISABLED` | 账号已停用，请联系管理员 | Your account has been disabled. Contact the administrator. |
| `ROOM_NOT_FOUND` | 房间不存在 | This room does not exist. |
| `ADMISSION_CHANGED` | 入房请求已过时或失效，请重新加入 | The room entry request is outdated or invalid. Please rejoin. |
| `ROOM_PASSWORD_REQUIRED` | 此房间需要输入入房密码 | Enter the password for this room. |
| `ROOM_PASSWORD_INCORRECT` | 房间密码不正确，请重新输入 | The room password is incorrect. Please try again. |
| `ROOM_PASSWORD_CHANGED` | 房间密码设置已改变，请重新验证后加入 | The room password has changed. Verify it again before joining. |
| `ROOM_PREFLIGHT_EXPIRED` | 入房预校验已失效，请重新验证 | The room check has expired. Please verify again. |
| `ROOM_PASSWORD_RATE_LIMITED` | 尝试过于频繁，请稍后再试 | Too many password attempts. Please try again later. |
| `ROOM_PASSWORD_BUSY` | 密码验证繁忙，请稍后再试 | Password verification is busy. Please try again shortly. |
| `BAD_REQUEST` | 请求内容无效，请重试 | The request is invalid. Please try again. |
| `INTERNAL_ERROR` | 服务暂时出现错误，请稍后重试 | The service encountered an error. Please try again later. |
| `MEDIA_SERVICE_UNAVAILABLE` | 语音服务暂时不可用，请稍后重试 | The voice service is unavailable. Please try again later. |
| `DEVICE_AUTHORIZATION_EXPIRED` | 二维码已过期、取消或已使用，请刷新后重新扫码 | The QR code has expired, been cancelled, or already been used. Refresh it and scan again. |
| `INVALID_AUTHORIZATION` | 本次客户端登录已失效，请重新登录 | This sign-in request is invalid or expired. Please sign in again. |
| `LOGIN_NOT_ALLOWED` | 此账号尚未获得登录权限，请联系管理员 | This account is not approved for sign-in. Contact the administrator. |
| `RETRY_LOGIN` | 登录信息已更新，请重新登录 | Your sign-in information has changed. Please sign in again. |
| `TRY_LATER` | 暂时无法接收新操作，请稍后重试 | New requests cannot be accepted right now. Please try again later. |
| `UNAVAILABLE` | 服务暂时不可用，请稍后重试 | The service is unavailable. Please try again later. |
| `INVALID_PROOF` | 客户端签名或请求时效无效，请重新加入 | The client signature is invalid or the request has expired. Please rejoin. |
| `ADMISSION_EXPIRED` | 本次入房已失效，请重新加入 | Your room entry authorization has expired. Please rejoin. |
