# COMPLIANCE.md

**项目：Chirp**
**文件性质：合规与法律声明**
**版本：1.0**
**最后更新：2026-11-26**

本文件应与仓库中的 `LICENSE`、`README.md` 和 `README.en.md` 一并阅读。使用、复制、分发、修改或部署本项目，即表示你已阅读并理解本文件全部内容。本文件不构成法律意见。

This document should be read together with `LICENSE`, `README.md`, and `README.en.md` in this repository. By using, copying, distributing, modifying, or deploying this project, you acknowledge that you have read and understood this document in its entirety. This document does not constitute legal advice.

---

## 1. 项目定位与边界 / Project Positioning and Boundary

### 中文

Chirp 是一个**以技术分享为目的的开放源代码项目**。作者发布本仓库的源代码、技术文档和预编译客户端，**不构成对任何通信服务的运营、销售或持续技术支持**。作者本人不架设、不运营任何可供公众使用的 Chirp 服务器，**不从本项目获取任何形式的收入或对价**。

使用者部署 Chirp 后所形成的通信服务，其运营者身份、法律义务与合规责任**完全由部署者自行承担**，与项目作者无关。

### English

Chirp is an **open-source project released for the purpose of technical sharing**. The author's publication of source code, technical documentation, and pre-compiled clients **does not constitute the operation, sale, or ongoing technical support of any communication service**. The author does not host or operate any publicly accessible Chirp server and **receives no revenue or consideration of any kind from this project**.

Any communication service created by a user through deploying Chirp is operated **solely by that user**, and all legal obligations and compliance responsibilities arising therefrom rest **exclusively with the deployer**, not with the project author.

---

## 2. 密码学与出口管制 / Cryptography and Export Control

### 中文

本项目包含密码学软件。Chirp 以**公开可获取的源代码形式**发布，旨在依据包括《瓦森纳安排》公有领域软件例外在内的适用法律框架，**不构成受出口许可管制的密码学产品分发**。本声明不构成法律意见；下载、使用、再分发或出口本软件的任何主体，应自行确认其所在司法辖区的进出口法律法规，并承担全部合规责任。本项目作者**未就本软件向任何出口管制主管机关提交通知或申请许可**，亦不承诺未来会这样做。

美国出口管理条例（EAR）下，公开可获取的加密源代码在特定条件下可能适用 TSU 例外（15 C.F.R. § 740.13），但该例外的适用以使用者自行完成必要通知为前提。**作者不代替使用者履行该等义务。**

### English

This project contains cryptographic software. Chirp is released in **publicly available source code form** and is intended to fall outside the scope of export-licensing requirements for cryptographic products under applicable frameworks, including the public-domain software exception of the Wassenaar Arrangement. **This notice is not legal advice.** Any person who downloads, uses, redistributes, or exports this software is solely responsible for determining and complying with the import and export laws of their jurisdiction. **The author has not filed any notification or license application with any export-control authority regarding this software**, and makes no commitment to do so in the future.

Under the U.S. Export Administration Regulations (EAR), publicly available encryption source code may qualify for the TSU exception (15 C.F.R. § 740.13) under certain conditions, but such qualification depends on the user completing any required notification. **The author does not undertake that obligation on behalf of any user.**

---

## 3. 数据保护设计（GDPR 第 25 条对接）/ Data Protection by Design (GDPR Article 25 Alignment)

### 中文

Chirp 在架构层面将端到端加密作为**基础性设计要素**而非可选功能。私钥与内容密钥由客户端本地持有，自托管服务端仅接触密文，不存储明文通信内容。这一设计使 Chirp 在技术架构上具备与《通用数据保护条例》（GDPR）第 25 条“通过设计保护数据”原则**对接的能力**。

**然而，作者不声明 Chirp 本身“符合 GDPR”。** GDPR 合规是**部署者作为数据控制者或处理者**的义务。将 Chirp 部署于任何涉及欧盟数据主体个人数据的场景之前，部署者应独立完成数据保护影响评估（DPIA），并根据其具体运营配置确定所需的组织与技术措施。

### English

Chirp treats end-to-end encryption as a **foundational architectural element**, not an optional feature. Private keys and content keys are held locally by clients; the self-hosted server touches only ciphertext and stores no plaintext communication content. This architecture gives Chirp the **capacity to align** with the “data protection by design” principle under Article 25 of the GDPR.

**The author does not, however, represent that Chirp is “GDPR-compliant” as such.** GDPR compliance is the obligation of the **deployer acting as data controller or processor**. Before deploying Chirp in any context involving personal data of EU data subjects, the deployer should independently conduct a Data Protection Impact Assessment (DPIA) and determine the organizational and technical measures required for its specific operational configuration.

---

## 4. 中国法律框架下的特别声明 / Special Notice under PRC Law

### 中文

**商用密码定位。** 本项目以开源方式公开源代码、技术文档与预编译客户端，**不以营利为目的，不针对特定对象提供商用密码产品销售或商用密码服务**。作者未就本项目取得任何商用密码相关许可或资质，亦不声称本项目属于经许可的商用密码产品。使用者如在中国境内将 Chirp 用于任何需要商用密码许可的场景，应自行取得相应资质并承担合规责任。

**不提供技术支持与后续介入。** 作者**不承诺**对本项目提供漏洞修复、功能更新、部署指导或针对特定使用场景的问题解答。作者**不会**在知悉任何特定主体将本项目用于违法犯罪活动后，继续为其提供修改、适配、维护或其他形式的协助。

**禁止性使用。** 本项目**禁止**用于任何违反中华人民共和国法律法规的活动，包括但不限于：从事电信网络诈骗、传播违法信息、规避国家监管措施、未经授权侵入他人网络或系统。使用者违反上述禁止所产生的全部法律后果，由使用者自行承担。

### English

**Commercial Cryptography Status.** This project discloses source code, technical documentation, and pre-compiled clients as open source **for non-profit purposes and does not offer commercial cryptography products or commercial cryptography services to any specific recipient**. The author holds no commercial cryptography license or qualification in connection with this project and makes no representation that this project constitutes a licensed commercial cryptography product. Any user who deploys Chirp in the PRC for any purpose requiring commercial cryptography licensing must independently obtain such qualification and bear compliance responsibility.

**No Technical Support or Subsequent Involvement.** The author **makes no commitment** to provide bug fixes, feature updates, deployment guidance, or issue resolution for any specific use case. The author **will not**, upon becoming aware that any particular party is using this project for illegal or criminal activity, continue to provide modifications, adaptations, maintenance, or any other form of assistance to that party.

**Prohibited Uses.** This project **shall not be used** for any activity that violates the laws and regulations of the People's Republic of China, including but not limited to: telecom or online fraud, dissemination of illegal content, circumvention of state regulatory measures, or unauthorized access to networks or systems. All legal consequences of any breach of these prohibitions rest solely with the user.

---

## 5. 一般免责 / General Disclaimer

### 中文

本项目按“现状”提供，不附带任何明示或默示的保证，包括但不限于适销性、特定用途适用性和不侵权的保证。作者不对因使用或无法使用本项目而产生的任何直接、间接、附带、特殊或后果性损害承担责任。本文件中的任何内容均不构成对任何司法管辖区法律合规状态的保证。

### English

This project is provided “as is”, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. The author shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use of or inability to use this project. Nothing in this document constitutes a representation of legal compliance in any jurisdiction.
