# 本地构建与服务端开发

本文面向希望修改服务端代码、调试协议或运行自动化测试的开发者。所有命令均在 **Chirp 产品源码仓库**的根目录执行；如果需要构建或调试四个原生客户端，请继续阅读[各平台客户端构建手册](/development/clients)。[查看源码仓库](https://github.com/YouZiFeiLe/Chirp/tree/main) · [系统架构](/reference/architecture)

## 工具链与依赖入口

| 研发模块 | 工具链与核心文件 |
| --- | --- |
| **Go 服务端、管理台与 Passkey 页** | [Go](https://go.dev/) 1.27.4（启用 cgo）、[Node.js](https://nodejs.org/)（用于运行网页前端单元测试）。业务、群组与测试夹具位于同一 Go 模块中。[go.mod](https://github.com/YouZiFeiLe/Chirp/blob/main/go.mod) · [Go 测试脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-sqlite.sh) |
| **四端共用 Rust 加密库** | [Rust](https://www.rust-lang.org/) 1.100.0 + [OpenMLS](https://openmls.tech/) 0.9.2。Apple 与 Android 编译目标声明在根工具链，Windows 单独使用 MSVC 工具链；升级原生依赖时须同步更新锁文件与第三方许可清单。[根工具链](https://github.com/YouZiFeiLe/Chirp/blob/main/rust-toolchain.toml) · [Cargo.toml](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/Cargo.toml) · [Cargo.lock](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/MLS/native/Cargo.lock) |
| **容器构建与发布** | 支持 `linux/amd64` 的 Docker Engine 与 Compose 2.26+。公开成品镜像来自 `deploy/Dockerfile` 的 `public` 目标。[Dockerfile](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) · [公开 Compose](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml) |
| **四大原生客户端** | macOS / iOS（Xcode 27 / Swift 6.4）、Android（JDK 27 / NDK 30 / CMake 4.1）、Windows（.NET 11 / WinUI 3 / MSVC）。详细步骤见[各平台客户端构建手册](/development/clients)。 |

## 启动本地独立开发实例

在 Linux 或 macOS 上，可以用以下命令在临时目录启动一个干净的本地 Go 服务（监听回环地址 `127.0.0.1:18115`），自动生成临时签名种子、SQLite 数据库与凭据文件：

```sh
mkdir -p .build
sh scripts/go.sh build -o .build/chirp ./cmd/chirp
chirp_bin="$PWD/.build/chirp"
chirp_run="$(mktemp -d "${TMPDIR:-/tmp}/chirp-dev.XXXXXXXX")"
"$chirp_bin" authorization -generate-key -key-file "$chirp_run/authorization-key"
(
  cd "$chirp_run" || exit 1
  exec env -i PATH="$PATH" \
    CHIRP_DATABASE_PATH=chirp.db CHIRP_PUBLIC_ORIGIN=http://localhost:18115 \
    LIVEKIT_HTTP_URL=http://127.0.0.1:7880 LIVEKIT_API_KEY=chirp \
    CHIRP_LIVEKIT_KEYS_FILE="$PWD/livekit-keys.json" "$chirp_bin" serve
)
```

> [!TIP] 测试原生客户端连入本地实例
> 上述命令生成了一把全新的临时签名种子，因此只能用于测试网页注册、数据库和发现接口。如果要用原生客户端登录这个本地实例，需导出公钥替换 `AuthorizationTrust.json` 后重编译客户端（或改用仓库里的 `deploy/authorization-key.default`），完整语音测试还需同时启动本地 LiveKit Server。[配置客户端授权公钥](/reference/authorization-keys)

在第二个终端验证健康接口与发现接口（注意需携带有效的 `X-Chirp-*` 平台与版本请求头，具体数值随当前客户端版本更新）：[发现接口实现](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/httpapi/client_config.go) · [Windows 版本声明](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/windows/engine/network_windows.go)

```sh
curl --fail http://localhost:18115/healthz
curl --fail --include http://localhost:18115/authorization/healthz
curl --fail -H 'X-Chirp-Platform: windows' -H 'X-Chirp-Version: 2026.11.24' \
  -H 'X-Chirp-Build: 1' http://localhost:18115/v1/client-config
```

## 服务端与网页自动化测试

在安装了 C 编译器（启用 cgo）的 Linux 或 macOS 上运行竞态检测、全部 Go 测试、静态检查与网页前端单元测试（Go 编译缓存默认放在 `.build/`，可用 `GOCACHE` / `GOMODCACHE` 覆盖）：[SQLite 测试脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-sqlite.sh) · [Go 包装脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/go.sh)

```sh
sh scripts/test-sqlite.sh local
node --test internal/webui/i18n_test.mjs internal/webui/client-version_test.mjs internal/passkeyhttp/native-login_test.mjs
```

如果在 **Windows 原生环境**开发，可直接运行路由、数据库与网页测试；注意由于签名种子强制校验 POSIX `0400`/`0600` 文件权限，包含完整密钥权限用例的测试须在 Linux 容器（`sh scripts/test-sqlite.sh docker`）中完成：[密钥权限校验](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/key.go)

```powershell
go run ./cmd/chirp version
go test ./internal/httpapi ./internal/passkeyhttp ./internal/adminhttp ./internal/group ./internal/store
go vet ./...
node --test internal/webui/i18n_test.mjs internal/webui/client-version_test.mjs internal/passkeyhttp/native-login_test.mjs
```

## 共享 Rust 库与跨语言向量测试

当修改设备证书、SAS 核验、`.chirpkey` 恢复文件格式或 OpenMLS 协议边界时，请同步运行 Rust 测试以及 Go / Swift 的跨语言共享向量回归测试：[共享测试向量](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/identity/testdata) · [Rust 核心源码](https://github.com/YouZiFeiLe/Chirp/tree/main/Client/apple/MLS/native/src)

```sh
cargo test --locked --manifest-path Client/apple/MLS/native/Cargo.toml
```

## 端到端隔离联调与容器镜像验收

### Python 端到端联调脚本（macOS）

在已经准备好 Swift 与原生库的 Mac 上，从仓库根目录依次运行下列集成脚本（因为脚本共用构建路径，请勿并发执行）：

| 验证目标 | 联调脚本与覆盖范围 |
| --- | --- |
| **入房准入与群组状态机** | [test-client-admission.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-client-admission.py) 覆盖密码预校验、切房与旧 `entry_id` 隔离；[test-group.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-group.py) 联调 Go、Swift 与 Rust，覆盖成员名单、重连、平滑轮换及租约过期。 |
| **授权快照与密钥年龄** | [test-v5-authorization.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-v5-authorization.py) 验证快照签名、多根读证明与永久撤销；[test-v5-key-age.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-v5-key-age.py) 验证 90s 主动重建与 120s 硬上限（加 `--candidate` 测试候选轮超时）。 |
| **附件传输与真实语音媒体** | [test-attachments.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-attachments.py) 验证密文分块上传、断点续传、回执与回收；[test-chat.py](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-chat.py) 启动真实 LiveKit 转发合成音频与聊天数据包（可指定 `--ios-simulator UDID`）。 |

### 本地构建并验证开源 Docker 镜像

发布或修改 Dockerfile 前，本地模拟 CI 构建 `public` 目标镜像，离线校验内置默认种子与各端公钥是否一致，并跑通 HTTP-01 与 DNS-01 两套 Compose 冒烟测试：[Dockerfile](https://github.com/YouZiFeiLe/Chirp/blob/main/deploy/Dockerfile) · [Compose 集成校验](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/test-open-source-compose.sh)

```sh
docker build --platform linux/amd64 --target public -f deploy/Dockerfile -t chirp-server:local-check .
docker run --rm -i --network none --read-only chirp-server:local-check authorization \
  -key-file /usr/share/chirp/authorization-key.default -verify-trust /dev/stdin \
  < Client/apple/Shared/Resources/AuthorizationTrust.json
sh scripts/test-open-source-compose.sh chirp-server:local-check
```

::: note 关于仓库保留的旧测试脚本
`scripts/test-ci.py` 与 `scripts/test-v5-docker.py` 用于回归早期的源码构建配置 `deploy/compose.yaml`。而 `smoke-server.py` 与 `test-logging.py` 会在容器内调用 `date` 命令，由于当前 `scratch` 成品镜像只包含 `chirp` 单一二进制文件，直接对成品镜像运行这两项脚本会报错，公开镜像请以 `test-open-source-compose.sh` 为准。
:::

## 网页与界面离线预览

无需启动数据库或 LiveKit，即可在本地直接预览 Passkey 网页、管理台与 Mac 客户端界面样式：

- **网页离线预览**：运行 `python3 design-system/chirp-together/preview-web.py`（依赖 Python 3.9+），随后在浏览器访问 `http://127.0.0.1:18761/` 查看登录与注册页（支持 `?appearance=dark`、`/register?state=receipt` 等参数），或访问 `http://127.0.0.1:18762/admin/` 查看管理台界面。[预览脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/design-system/chirp-together/preview-web.py) · [设计令牌](https://github.com/YouZiFeiLe/Chirp/blob/main/design-system/chirp-together/design-tokens.json)
- **macOS 客户端离线预览**：在 Mac 运行 `./scripts/build_and_run.sh --design-preview`，也可附加 `--identity-setup-preview`、`--attachment-transfer-preview`、`--room-information-preview` 或 `--device-verification-preview` 查看各关键交互流。[图标导出脚本](https://github.com/YouZiFeiLe/Chirp/blob/main/scripts/export-apple-icons.py)

## 国际化文案与错误码维护

- **Web 文案**：字典与样式位于 [`internal/webui`](https://github.com/YouZiFeiLe/Chirp/tree/main/internal/webui)，修改后务必运行上方的 `node --test` 验证中英双语键、占位符与错误映射一致性。
- **客户端错误码**：修改 [`ClientError.swift`](https://github.com/YouZiFeiLe/Chirp/blob/main/Client/apple/Shared/ClientError.swift) 后，必须同步更新中英文 `Errors.strings`，并运行 `python3 -X utf8 Client/apple/Scripts/check-localizations.py` 检查覆盖率；同时将更新同步至[客户端错误码表](/reference/error-codes)。
