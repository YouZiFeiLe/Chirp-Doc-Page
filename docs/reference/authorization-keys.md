# 授权快照签名密钥

Chirp 使用一把独立的 **[Ed25519](https://datatracker.ietf.org/doc/html/rfc8032) 签名种子**来为设备授权历史快照签名。服务端在 `/authorization/v5/snapshot` 用这把私钥签名，而 macOS、iOS、Android 与 Windows 四个客户端则在构建时把对应的**公钥**直接打包进安装包里。

这种「服务端持有种子、客户端硬编码公钥」的设计形成了一条独立的信任校验链：哪怕有人试图搭建山寨授权接口，只要拿不出对应的签名种子，客户端就会在验签阶段直接拒绝登录。

::: warning 开源默认种子 vs. 自用独占种子
官方 Docker Hub 成品镜像内置了一把**公开示例签名种子**（与源码中打包好的客户端公钥配套），方便用户一键开箱即用。但这也意味着所有直接运行默认镜像的服务器都共用同一对签名身份。如果你希望**完全独占自己服务器的授权签名权**，请务必生成一套自用种子，并同步重新构建打包客户端。[从零部署](/hosting/) · [加密与安全边界](/reference/security)
:::

## 默认密钥文件与位置

| 文件或配置项 | 作用与说明 |
| --- | --- |
| `deploy/authorization-key.default` | 仓库中公开的默认 Ed25519 seed，格式为 44 字节规范 Base64（无末尾换行）。 |
| `Client/apple/Shared/Resources/AuthorizationTrust.json` | 四个客户端共用的构建输入文件，仅包含 `{"public_key": "..."}`。 |
| `/usr/share/chirp/authorization-key.default` | 成品 Docker 镜像中内置的开源默认种子（属主 `65532`，权限 `0400`）。 |
| `CHIRP_AUTHORIZATION_KEY_FILE` | 环境变量，用于指定 `app` 启动时实际加载的种子文件路径（自用场景推荐只读挂载至 `/run/secrets/authorization-key`）。 |

客户端打包读取位置如下：
- **macOS / iOS**：打包进应用 Bundle 资源，运行时从 `Bundle.main` 读取。
- **Android**：Gradle 构建任务校验后打包为 APK 内的 `assets/AuthorizationTrust.json`。
- **Windows**：构建脚本复制到与 `Chirp.Protocol.exe` 同级的发布目录（MSIX 包中位于根目录）。

> [!NOTE] 与其他密钥的关系
> 授权快照签名密钥只负责验证「设备登记与撤销历史快照」。用户的账号根私钥、设备私钥、Passkey、MLS 内容密钥以及 LiveKit 媒体凭据（首次启动随机生成于 `keys.json`）均各自独立产生，互不依赖。[公开 Compose 配置](https://github.com/YouZiFeiLe/Chirp/blob/main/compose.yaml)

## 生成自用密钥并挂载到服务端

如果你想构建一套完全私有的授权签名身份，可以在一台可信的 Linux、macOS 或 WSL（Linux 文件系统）开发机上，于产品仓库根目录执行以下命令（需要安装对应 `go.mod` 版本的 Go）。授权 CLI 完全离线运行，种子文件以 `0600` 权限生成且**绝不覆盖已有文件**：[授权 CLI 源码](https://github.com/YouZiFeiLe/Chirp/blob/main/cmd/chirp/authorization.go) · [配置加载源码](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/config/authorization.go)

```sh
mkdir -p .build/authorization
go run ./cmd/chirp authorization -generate-key \
  -key-file .build/authorization/new-key
go run ./cmd/chirp authorization -export-trust \
  -key-file .build/authorization/new-key \
  > .build/authorization/AuthorizationTrust.json
cp .build/authorization/AuthorizationTrust.json \
  Client/apple/Shared/Resources/AuthorizationTrust.json
go run ./cmd/chirp authorization -verify-trust \
  Client/apple/Shared/Resources/AuthorizationTrust.json \
  -key-file .build/authorization/new-key
```

> [!TIP]
> `-verify-trust` 校验匹配成功后会以退出码 `0` 静默退出（无输出）。如果命令行省略 `-key-file`，授权 CLI 会依次尝试读取环境变量 `CHIRP_AUTHORIZATION_KEY_FILE` 或 `/run/secrets/authorization-key`；裸机直接运行 `chirp serve` 时默认查找业务数据库同目录下的 `authorization-key`。

接下来，通过安全渠道把生成的 `new-key` 传送到你的部署服务器（`~/chirp` 所在主机），安装为容器 UID `65532` 只读的密钥文件（要求文件权限必须为 `0400` 或 `0600`）：

```sh
cd ~/chirp
sudo install -d -m 0700 secrets
sudo install -o 65532 -g 65532 -m 0400 /实际存放位置/new-key secrets/authorization-key
```

在 `compose.yaml` 同目录下创建 `compose.override.yaml`（Docker Compose 会自动合并两份配置），覆写密钥环境变量与只读挂载：

```yaml
services:
  app:
    environment:
      CHIRP_AUTHORIZATION_KEY_FILE: /run/secrets/authorization-key
    volumes:
      - type: bind
        source: ./secrets/authorization-key
        target: /run/secrets/authorization-key
        read_only: true
        bind:
          create_host_path: false
```

随后**使用更新后的 `AuthorizationTrust.json` 重新构建并签名各平台客户端**，并在服务器执行 `sudo docker compose up -d --force-recreate --wait app` 使新种子生效。**切记离线妥善备份自用种子及其配套公钥**，更换密钥后，旧公钥客户端将无法继续登录此服务器。

## 多服务器切换与域名隔离规则

客户端完成服务发现后，会根据已确认的 `passkey_origin` 自动拼出授权端点（例如 `https://voice.example.com:8443` 对应 `https://voice.example.com:8443/authorization/v5/snapshot`）。

- **切换服务器**：在客户端更换服务器地址后必须重新确认连接，授权接口也会随新服务地址切换，但应用内置的信任公钥保持不变。
- **严格按规范 Origin 隔离**：签名消息内的 Origin 采用小写主机名加显式端口的规范格式（例如 `https://chirp.first.test:443`）。账号根身份、好友设备信任与本地授权历史检查点均严格按 Origin 隔离。即使两台服务器共用了同一把默认签名种子，**更换服务器域名后也无法将旧域名的授权历史重放到新域名上**。[Origin 规范化](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/identity/activation.go) · [快照签名](https://github.com/YouZiFeiLe/Chirp/blob/main/internal/authorization/server.go)

## 构建产物公钥一致性核验

重新构建客户端后，分发前建议按平台逐字节核对安装包内嵌入的公钥是否确实已替换为最新的 `AuthorizationTrust.json`：

- **macOS / iOS**：对比构建产物中的资源文件，一致时 `cmp` 静默返回 `0`（[Apple 构建手册](/development/clients#apple-macos--ios)）：
  ```sh
  cmp Client/apple/Shared/Resources/AuthorizationTrust.json \
    Client/apple/dist/macos/Chirp.app/Contents/Resources/AuthorizationTrust.json
  cmp Client/apple/Shared/Resources/AuthorizationTrust.json \
    .build/DerivedData-ios-device/Build/Products/Release-iphoneos/Chirp.app/AuthorizationTrust.json
  ```
- **Android APK / Windows MSIX**：从产品仓库根目录使用 Python 3 直接校验压缩包内部文件（Windows 若使用 `py` 启动器可把 `python3` 改为 `py -3`，最后一个参数替换为你的 `.apk` 或 `.msix` 路径）：
  ```sh
  python3 -c "
  import sys
  from pathlib import Path
  from zipfile import ZipFile

  package = Path(sys.argv[1])
  entries = {'.apk': 'assets/AuthorizationTrust.json', '.msix': 'AuthorizationTrust.json'}
  entry = entries[package.suffix.lower()]
  expected = Path('Client/apple/Shared/Resources/AuthorizationTrust.json').read_bytes()
  with ZipFile(package) as archive:
      if archive.namelist().count(entry) != 1 or archive.read(entry) != expected:
          raise SystemExit('安装包内公钥缺失、重复或与共享文件不符')
  print('安装包内公钥与共享文件一致')
  " Client/android/app/build/outputs/apk/release/app-release.apk
  ```

如需了解服务端完整环境变量或容器持久化挂载细节，可参考[服务端配置与运维](/hosting/operations)。
