# Introduction

本项目是通过vibe coding方式0手写代码实现的，本文档用于记录项目成长过程中用到的Prompts.

IDE使用Google的AntiGravity，模型使用Opus（开了个Gemini Pro会员，比较便宜，看不出额度有多少，目前没遇到超额的问题）

遇到复杂的情况，我会先通过Gemini 3 Pro模式，通过多轮对话，来创建Prompt。

# day1 构建系统原型

- 输入基本的项目要求，把项目创建出来

```
你是云原生的技术专家，正在做一款图形化的工具，可以实现拖拉拽方式编辑K8s的资源组合，例如页面左侧有K8s中的各种资源（Deployment、Pod、svc、Statefulset、ingress、pvc、configmap等）从页面上拖拽出一个1个Deployment，1个statefulset，为Deployment关联一个nodeport类型的svc（名为svc1），让statefulset关联一个custerip类型的svc（名为svc2），最后通过连线，让Deployment通过svc2访问statefulset，让最终客户通过svc1访问Deployment。拖拽完成后，可以点击拖拽出来的组件，修改K8s中对应资源的各种参数。点击保存以后把创建请求发送给K8s集群。
在技术实现上，连线操作应该通过Selector等方式，实现2个资源的关联。本次编排的所有资源，应该统一打上一个label，以便后续查询。
编辑好的资源组合后续可以根据前面打的label查询出来，展示到图形化的画布中，并且支持修改。
K8s的api地址、认证token放到单独的配置文件中。
页面设计风格参考cncf dashboard的风格或者aws等大厂的风格，使用亮色调。
```

- 自测发现一些问题，进行修改

```
测试发现连线操作不方便，需要在绘图区域增加一个连线的组件，可以通过拖拽连线组件连接2个资源。连线应该是有方向的，例如svc连线指向Deployment，Deployment指向pvc，代表Deployment挂载pvc

```

```
当前功能已经正常，但是有个需要优化的地方，目前无论是用画笔还是直接拖动，目的节点只会连接上下的两个原点，左右不会被连接，即便直接拖到左右的圆点上。需要优化成连接选中的原点或者根据连线的方向选择就近的圆点。
```

```
测试成功，现在还有个小问题，在从小圆点拖动连线的时候，会出现2条线，有一条直线（和选中画笔时候出现的直线一样），这条线是多余的，需要去掉。

```


# day2 增加可编辑的字段

- 目标是把K8s接口中支持的字段都加进去，比较负复杂，所以这里先找Gemini生成prompt


```
gemini3:我正在通过cursor进行vibe coding，当前图形化界面的原型已经完成，已经可以在图形化界面上创建出资源，但是每个资源可以编辑的字段还比较少。请根据上述资源中的字段分析结果，和UI设计建议，生成prompt

```

```
gemini3:我要采用方案一+方案二，全量资源字段扩展 Prompt，以及核心复杂组件专项攻，但是你现在给出的prompt中资源列举不完整，字段列举也不完整，请给出跟完整的资源和字段，形成一个更为具体的prompt

```

- Gemini生成了一大段Prompt，输入到opus中


```
当前所有功能测试已经正常，但是每个资源组件中，可以编辑的字段还比较少，请根据下面的指引，完善每个资源的可编辑字段
# Role: Kubernetes Frontend Architect & Expert
我正在开发一个 K8s 图形化编辑器（基于 React + TypeScript）。目前的 UI 原型仅支持最基础的创建。
现在需要你帮我**工程化地扩展表单字段**。请根据 Kubernetes API 定义（v1.30+），按照以下详细规范，为我生成或重构表单配置代码（Schema/Config）。

## 目标
我们需要覆盖以下核心资源，并为复杂的 Pod/Container 提供深度编辑能力：
1. **Workloads**: Deployment, StatefulSet, DaemonSet, Job, CronJob
2. **Network**: Service, Ingress
3. **Config**: ConfigMap, Secret
4. **Storage**: PersistentVolumeClaim (PVC)
5. **Access**: ServiceAccount

---

## Part 1: 通用元数据 (Metadata) - 所有资源共有
所有资源表单的顶部必须包含：
- `metadata.name`: String (必填, 正则校验 DNS-1123)
- `metadata.namespace`: Select (下拉选择 ns)
- `metadata.labels`: Key-Value Map Editor (键值对)
- `metadata.annotations`: Key-Value Map Editor (键值对)

---

## Part 2: 核心组件深挖 - Pod & Container Spec
**注意**：Deployment, StatefulSet, DaemonSet, Job, CronJob 都依赖 `PodTemplate`。请设计一个复用的 `PodSpecEditor` 和 `ContainerEditor` 组件。

### A. Container 详情 (核心难点)
`spec.containers[]` 数组中的每一项需包含：
1. **基础信息**:
   - `name`: String (必填)
   - `image`: String (必填)
   - `imagePullPolicy`: Select [`Always`, `IfNotPresent`, `Never`]
   - `workingDir`: String
2. **生命周期**:
   - `command`: List<String> (Entrypoint)
   - `args`: List<String> (Arguments)
3. **网络**:
   - `ports`: List<Object>
     - `name`: String
     - `containerPort`: Number (1-65535)
     - `protocol`: Select [`TCP`, `UDP`, `SCTP`]
4. **环境变量 (Env)**: List<Object>
   - 类型切换: [Value (直接值) | ValueFrom (引用)]
   - 若选 Value: 输入 `name`, `value`
   - 若选 ValueFrom: 输入 `name`, 选择 `configMapKeyRef` 或 `secretKeyRef`
5. **资源限制 (Resources)**:
   - Grid 布局: Requests (CPU, Memory) & Limits (CPU, Memory)
6. **健康检查 (Probes)**: 
   - Tab页切换: `livenessProbe` / `readinessProbe` / `startupProbe`
   - 检测方式: Select [`httpGet`, `tcpSocket`, `exec`]
     - `httpGet`: path, port, scheme [`HTTP`, `HTTPS`]
     - `tcpSocket`: port
     - `exec`: command (List<String>)
   - 参数: initialDelaySeconds, periodSeconds, timeoutSeconds, failureThreshold
7. **挂载 (VolumeMounts)**: List<Object>
   - `name`: Select (从 Pod 定义的 Volumes 中选)
   - `mountPath`: String
   - `subPath`: String
   - `readOnly`: Boolean

### B. Pod Spec 通用配置
- `restartPolicy`: Select [`Always`, `OnFailure`, `Never`]
- `serviceAccountName`: Select (列出当前 ns 下的 SA)
- `nodeSelector`: Key-Value Map
- `hostNetwork`: Boolean
- `volumes`: List<Object> (定义卷源)
  - `name`: String
  - `type`: Select [`emptyDir`, `configMap`, `secret`, `persistentVolumeClaim`, `hostPath`]
  - 根据 Type 显示对应字段 (例如 PVC 需要 claimName)

---

## Part 3: 资源特定字段映射表 (Resource Specifics)
请根据下表为每种资源生成对应的 Schema 或表单字段：

| 资源 | 关键字段路径 (Spec) | 类型/枚举 | 说明 |
| :--- | :--- | :--- | :--- |
| **Deployment** | `replicas` | Number | 副本数 |
| | `strategy.type` | Select [`RollingUpdate`, `Recreate`] | 更新策略 |
| **StatefulSet** | `serviceName` | String | 必填，关联 Headless Service |
| | `replicas` | Number | |
| | `volumeClaimTemplates` | List<PVC> | 极其重要，用于有状态存储 |
| **DaemonSet** | `updateStrategy.type` | Select [`RollingUpdate`, `OnDelete`] | |
| **Job** | `completions` | Number | 完成次数 |
| | `parallelism` | Number | 并行数 |
| | `backoffLimit` | Number | 重试次数 |
| **CronJob** | `schedule` | String | Cron 表达式 (如 `*/1 * * * *`) |
| | `concurrencyPolicy` | Select [`Allow`, `Forbid`, `Replace`] | |
| | `jobTemplate` | Object | 嵌套 Job Spec |
| **Service** | `type` | Select [`ClusterIP`, `NodePort`, `LoadBalancer`, `ExternalName`] | |
| | `selector` | Key-Value Map | 关联 Pod Label |
| | `ports[]` | List | port, targetPort, nodePort, protocol |
| **Ingress** | `ingressClassName` | String | |
| | `rules[]` | List | host, http.paths (path, pathType, backend) |
| | `tls[]` | List | hosts, secretName |
| **ConfigMap** | `data` | Key-Value Map | 纯文本数据 |
| **Secret** | `type` | Select [`Opaque`, `kubernetes.io/tls`, etc.] | |
| | `data` | Key-Value Map | 值需 Base64 (UI层需处理 decode/encode) |
| **PVC** | `accessModes` | Multi-Select [`ReadWriteOnce`, `ReadOnlyMany`, `ReadWriteMany`] | |
| | `resources.requests.storage` | String | 如 `10Gi` |
| | `storageClassName` | Select | 存储类 |

---

## Part 4: UI/UX 实现要求
1. **组件化**: 不要把代码写在一个巨型文件中。请将 `ContainerEditor`, `ProbeEditor`, `VolumeEditor` 拆分为独立组件。
2. **类型安全**: 使用 Zod 定义 Form Schema，确保生成的 YAML 符合 K8s 类型定义。
3. **交互优化**: 
   - 对于 `Enums` (枚举)，必须使用 `<Select>` 组件。
   - 对于 `Map` (如 Labels)，使用动态增减行的 `<KeyValueInput>` 组件。
   - 对于 `Array` (如 Ports)，使用带有 "Add Item" 按钮的列表组件。
4. **渐进式披露**: 将高级字段（如 `securityContext`, `affinity`, `tolerations`）放入 "Advanced Settings" 折叠面板中，避免默认显示过于杂乱。

请根据以上详细规范，先为我规划**数据结构定义 (TypeScript Interface / Zod Schema)**，然后实现。
```



- 再优化一下样式

```
请参考docs/images/screenshot.png的样式，重新设计风格。

还有资源组件的图标，也需要参考截图中的样式，选择K8s社区社区原生的图标
```

```
优化样式，使其更为美观
1）左侧的资源组件，从左右结构改成上线结构，上面的图标改成大图标，下方配组件名称的文字（如Deployment、Pod等），鼠标移动到组件上面后，显示介绍（比如“无状态应用部署”、“有状态应用部署”)
2）顶部的画笔，移动到画布靠左上方，画笔背景改成透明（仅显示画笔图形），鼠标移动到画笔上时，显示介绍“拖拽到节点上进行连线”。
3）拖拽出来的资源组件，缩小默认的大小，组件四周的四个小圆点，也进一步缩小
```

```
进一步优化样式
1）左侧资源栏，每个资源的尺寸设置成一样，并统一竖排排列（当前有一些资源是横向排列的）
2）鼠标移动到资源图标上时，没有显示具体的描述，需要修改
3）左上角的画笔，当前是一个钢笔的图形，改成铅笔造型，并且当前鼠标移动到画笔图标上时，也没显示说明，需要优化
4）右侧的资源属性编辑窗口，容器配置这部分，底色是白色的，需要改成搭配主题的暗色调。
```

```
1）鼠标移动到左侧资源图标上时，还是没有显示具体的描述，需要修改。
2）连线改成实线
```


# day3 增加单元测试和集成验证，验证生成的K8s接口参数是否准确

- 这里先找Gemini讨论下怎么能验证前端生成的接口参数是符合规范的

```
gemini: 在是使用了上面的“全量资源扩展与核心组件深挖的超级 Prompt”后，代码已经生成，由于涉及的字段比较多，组合形式也比较负责，我需要验证最终通过代码生成的yaml是符合K8s的接口规范，请设计一套校验的方案，例如K8s社区是否有一些API参数的校验工具？或者通过K8s源码中的schema来校验？
```

```
Gemini:我想要先加一大批单元测试，来验证通过前端代码生成的yaml是符合规范的，请推荐方案。
```

```
Gemini:我需要生成单元测试来验证前端生成的yaml是否符合K8s v1.33的规范，请根据上述思路，为了生成在cursor中使用的prompt
```

- Gemini为了生成了一大段Prompt，输入到Opus中


```
# Role: QA & Frontend Infrastructure Engineer

I am working on "KubeCanvas", a React-based Kubernetes resource editor. I need to implement a robust unit testing strategy to verify that the YAML generated by my frontend application strictly adheres to **Kubernetes v1.33** specifications.

My tech stack is: **Vitest, TypeScript, Node.js**.

Please help me implement the following testing infrastructure. Do not implement everything in one file; separate them by responsibility.

## Task 1: Install Dependencies
Suggest the `npm` or `pnpm` commands to install the following necessary libraries:
- `vitest` (Test runner)
- `ajv` (JSON Schema Validator, extremely important for performance)
- `ajv-formats` (To handle formats like email, ipv4, etc.)
- `js-yaml` (To parse generated YAML back to JSON for validation)

## Task 2: Schema Management Script (`scripts/download-schemas.ts`)
Create a TypeScript/Node script to download the official Kubernetes JSON Schemas.
- **Target Version**: `v1.33.0` (Use a variable so I can change it easily).
- **Source**: Use `https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master` or a similar reliable source for standalone-strict schemas.
- **Action**: It should download schemas for core resources (`Deployment`, `Service`, `ConfigMap`, `Secret`, `Ingress`, `PersistentVolumeClaim`) and save them to `src/test/schemas/`.
- **Note**: Ensure it handles errors if v1.33 is not yet published by falling back to `master` or the latest stable version, but try v1.33 first.

## Task 3: The Validator Helper (`src/test/validator.ts`)
Create a reusable helper class/function `K8sSchemaValidator`.
- It should initialize `Ajv` with `strict: false` (to handle K8s schema quirks) and `allErrors: true`.
- It should load the downloaded JSON schemas from the local file system.
- It should expose a method `validate(yamlString: string, resourceType: string)`:
    - Parse the YAML string to JSON.
    - Validate it against the loaded schema.
    - Return `{ valid: boolean, errors: string[] }`.

## Task 4: Unit Test Implementation (`src/generators/__tests__/Deployment.test.ts`)
Assume I have a generator function `generateDeployment(formData: DeploymentForm)` in `src/generators/deployment.ts`.
Write a Vitest test file that:
1. Imports the generator and the `K8sSchemaValidator`.
2. Defines a mock `formData` object representing a full Deployment (replicas, image, ports, resources, livenessProbe, etc.).
3. Calls the generator to get the YAML.
4. **Assertion 1**: Snapshot match (to detect regression).
5. **Assertion 2**: Schema Validation. Pass the generated YAML to the validator and assert that `result.valid` is `true`.

## Constraints
- Use strictly typed TypeScript.
- Ensure the directory structure is clean.
- Explain how to run the schema download script before running tests.
```

- 做一些调整

```
测试要覆盖所有资源类型，并且增加各种组合，例如Deployment中组合了configmap和pvc等等。尽可能覆盖各种组合，同时也增加一些异常测试，比如传错了值的类型，传错了枚举值等。最后，把Walkthrough也保存到doc下
1.33的schema可以在https://github.com/yannh/kubernetes-json-schema/tree/master/v1.33.7-standalone-strict 目录下找到，请更新schema，测试要增加statefulset、job、cronjob
```

```
K8s的配置文件拆成2个，一个是example文件，存放配置的填写说明，另一个是真实的配置。真实配置要填到gitignore中，避免信息泄露
```
```
增加in-cluster running模式，将整个工程运行到K8s的pod中，然后通过pod默认挂载的service token和api server地址访问K8s集群。将这种in cluster running配置成默认模式，也就是默认情况下，会从pod中读取service token和api server等信息，也可以开启costom模式，手动配置apierser和token等信息。相关配置也都加到配置文件中来控制
```

- 测试遇到了cors问题，报错提给opus，自己修复
```
{
    "message": "Network Error",
    "name": "AxiosError",
    "stack": "AxiosError: Network Error\n    at XMLHttpRequest.handleError (http://localhost:5173/node_modules/.vite/deps/axios.js?v=5d45d2c3:1637:19)\n    at Axios.request (http://localhost:5173/node_modules/.vite/deps/axios.js?v=5d45d2c3:2223:41)\n    at async getResourcesByLabel (http://localhost:5173/src/composables/useK8sApi.js:229:26)\n    at async listCompositions (http://localhost:5173/src/composables/useK8sApi.js:265:35)\n    at async refreshCompositions (http://localhost:5173/src/App.vue:146:26)",
    "config": {
        "transitional": {
            "silentJSONParsing": true,
            "forcedJSONParsing": true,
            "clarifyTimeoutError": false
        },
        "adapter": [
            "xhr",
            "http",
            "fetch"
        ],
        "transformRequest": [
            null
        ],
        "transformResponse": [
            null
        ],
        "timeout": 30000,
        "xsrfCookieName": "XSRF-TOKEN",
        "xsrfHeaderName": "X-XSRF-TOKEN",
        "maxContentLength": -1,
        "maxBodyLength": -1,
        "env": {},
        "headers": {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",***
        },
        "baseURL": "https://139.196.28.96:36443",
        "params": {
            "labelSelector": "kubecanvas.io/managed-by=kubecanvas"
        },
        "method": "get",
        "url": "/apis/apps/v1/namespaces/kubecanvas/deployments",
        "allowAbsoluteUrls": true
    },
    "code": "ERR_NETWORK"
} 还是报网络错误，但是终端测试curl -k  https://139.196.28.96:36443是可以联通的

```

- 修改几个报错后，自测发现一个逻辑问题，连线不会让关联的pvc等volume填到Deployment等资源中。


```
测试发现关联pvc、secret、configmap到Deployment、statefulset、pod、job、cronjob等资源时，并没有修改这些资源中的volumes下的对应内容
```

```
测试发现如果直接创建Deployment和pvc，他们连线以后，Deployment中没有出现volume，控制台没有任何输出。但是先做一遍pvc和pod的连线，然后对这个pvc做和Deployment的连线，就正常了。此时控制台有输出
```


```
测试发现点击“已保存的组合”，页面上显示“已加载资源”但是画板上没有显示出组件和连线

```



# day4 优化ns的设置逻辑

```
优化Namespace的逻辑
1）对于配置文件中设置的默认Namespace，应该默认设置到画布上拖出来的资源组件中，例如配置中设置了Namespace为test1，那么所有从画布上拖出来的组件的namespace应该也设置为test
2）页面左侧的资源栏新增Namespace类型的资源，拖动Namespace到画布上时，应该是一个较大的方块（可以改变大小），然后其他资源组件如果拖动到这个Namespace的方块中，则把对应资源组件的Namespace的值设置成该Namespace的值，如果拖到Namespace方块外面，则设置成配置文件中配置的Namespace的默认值
```


```
默认namespace测试通过，但是侧边栏没有namespace类型的资源
```


```
把资源组件拖入、拖出Namespace组件，可以正确修改资源组件的Namespace值，但是有几个问题要优化
1）namespace组件应该放在侧边栏最上方，并且namespace组件应该有个logo（请参考cncf官方项目，如dashborad项目）更新logo
2）namespace组件的大小默认要更大一些
3）当资源组件拖入namespace组件后，资源组件就无法被选中，而只能选中namespace组件,需要改成优先选中资源组件
4) 移动namespace组件时，namespace组件内部的资源组件应该跟着移动
5）当资源组件拖入namespace组件时，应该高亮namespace组件的边宽，提示用户已正确移入。

```

```
保存的时候报useK8sApi.js:210   POST http://localhost:5173/k8s-api/apis/batch/v1/namespaces/namespace-4630/cronjobs 404 (Not Found) 应该是创建顺序问题，应该先创建那么，再创建其他资源。另外，Namespace资源的属性中，不应该在有Namespace了（当前显示有个名为default的Namespace）
```


```
已可以正常创建。下一步优化namespace组件的操作逻辑，当前一旦操作过namespace后，Namespace组件就会一直处在选中状态，导致namespace内部的组件无法操作，直到再Namespace外部点击下鼠标，才会取消选中。需要改成操作完namespace后，默认取消选中，让namespace内部的组件处于可以被选中的状态。
```

```
测试通过，在鼠标悬浮到Namespace组件最上面的灰色横条时，提示“双击选中”
```

```
从鼠标悬浮到提示双击延迟有点高，缩短延迟
```

# day 5 重点优化保存-恢复的逻辑

- 遇到一个问题，我保存的组合，如果是在default ns下的，就能查询出来，进行恢复。如果是新建的ns，就查询不出来。所以这里先问下实现逻辑
```
分析“已保存的组合”这个功能是如何实现的，包括保存的数据存放到哪里，如何读取等等
```


- 从AI反馈的结果看，实际上AI是通过特定label去K8s里查询的，我们这里优化一下

```
遇到一个问题，“已保存的组合”，如果是在default ns下的，就能查询出来，进行恢复。如果是新建的ns，就查询不出来。我认为当前是只会去default ns下的查询引起的。我建议的修改方式是创建组合的时候，把ns的名称保存到一个configmap中（这里主要要去重）。后续查询的时候，先从configmap中查询出所有ns，然后在遍历这些ns，从label中查询查保存的组合。
请判断这种方式是否合理，如果合理，按这个方式进行优化，如果不合理，请给出更好的实现方式并优化相关代码。
```

- AI让我直接查询所有NS，我觉得这种查询太慢，还是建议用configmap保存一些
```
不采用方案B，因为有些项目的NS数量很多，每个NS下的各类资源数量也可能很大，所以跨ns查询的代价太大。所以还是建议采用方案A，并且建议在configmap中，直接维护ns和CompositionId的键值对，这样页面上很快就能查出所有保存的组合，当选中某个组合时，再去查询对应ns下的资源
```

```
测试通过，有几个优化的地方
1）保存的时候，弹出一个对话框输入组合的名称，把这个名称也保存到configmap中。
2）用户点击确认，保存到K8s的时候，出现一个“保存中...”的状态提示，保存成功后，显示保存成功，提示消失，这个提示要放到明显一些的位置，建议用配合一些图标、进度条等方式实现。
3）侧边栏下方保存的组合查询出来的列表，显示客户自己填写的组合名称
4）点击侧边栏某个保存的组合，进行恢复的时候，也出现一个恢复中的状态提示，成功后，显示恢复成功，提示消失，这个提示要放到明显一些的位置，建议用配合一些图标、进度条等方式实现。
```


```
请修改整体画笔的设计，画笔不要直接拖拽到节点上，而是先点击画笔，让画笔处于选中状态，然后在某一个组件上点击画笔，这个时候连线的起点被选中，画笔处于可拖动状态，然后把画笔拖动到另一个组件上，完成连线
```


```
从保存的组合恢复，发现连线恢复不了，控制台有如下报错App.vue:296  [Vue Flow]: Edge source or target is missing
Edge: e43f4f1d5-272c-4492-90a2-447609860d93-2ee64f09-3b43-4b19-aab9-8be16714a645-bottom-top 
Source: 43f4f1d5-272c-4492-90a2-447609860d93 
Target: 2ee64f09-3b43-4b19-aab9-8be16714a645 其他控制台日志是Loaded resources from K8s
```

```
从已保存的组合恢复出来的组件，如果之前组件是在某个Namespace组件内的，恢复出来以后，组件没有显示到namespace内部
```

```
Namespace 容器内资源位置问题已测试通过。有两个优化的点1）恢复出来的连线是蓝色实现，但是新建的连线是蓝色虚线，现在统一改成蓝色实线 2）当前恢复出来的组件排序和连线有些杂乱，会出现线条穿插过组件的情况，或者命名有更短的连线，确绕了一大圈，请设计一套方案，让恢复出来的图形和连线排列更合理一些
```


```
功能正常，但是还需要进一步优化，1）恢复出来的资源组件，看上去是以其中一个来定位的，如果两个组件并排时，就会出现偏向一侧，需要根据组件排列，选择最中间位置的组件或者2个组件的中间位置。 2）组件之间的连线还是不够美观，比如出现并排的两个组件的连线，从左边组件的上方连到了右边组件的下方，而没有就近的选择左边组件的右边连到右边组件的左边。3）不同组件的分层，建议Ingress最上方，然后下方第二层是Service，第三层是Deployment、Statefulset、job、cronjob，第四层是pod，第五层是pvc、configmap、secret，如果恢复的时候没有这一层，那就跳过，下面的向上移动一层
```


# day 6 优化组件修改、删除的逻辑

- 先求助一下gemini，问他如何处理不可修改的字段(接着之前的上下文)

```我还需要梳理出K8s这些资源中，所有不允许修改的字段，即创建后，无法通过patch修改的字段，请给出方案```


- gemini给了一段Prompt，现在输入到opus中
```
# Role: Kubernetes Schema Expert & Tooling Engineer

我正在开发 KubeCanvas 编辑器。我们需要处理 **"Edit Mode" (修改模式)** 下的字段锁定逻辑。
Kubernetes 中有很多字段在创建后是 **不可变 (Immutable)** 的（例如 `metadata.name`, `StatefulSet` 的 `volumeClaimTemplates`）。

请帮我完成以下两件事：

## Task 1: 编写 Schema 扫描脚本 (`scripts/scan-immutables.ts`)
编写一个 Node.js 脚本，读取 `src/test/schemas/` 目录下下载的 K8s JSON Schema 文件，自动分析并提取可能的不可变字段。

**扫描策略：**
1. 遍历 Schema 中的所有属性。
2. 检查 `description` 字段是否包含以下关键词（不区分大小写）：
   - "Immutable"
   - "Cannot be updated"
   - "Cannot be modified"
   - "Replacement required"
3. (可选) 检查是否有 `x-kubernetes-immutable: true` 属性。
4. 输出一个 JSON 报告，格式如下：
   ```json
   {
     "Deployment": ["metadata.name", "metadata.namespace", "spec.selector"],
     "StatefulSet": ["spec.volumeClaimTemplates", "spec.serviceName", ...]
   }
```

- opus给我整理了一个immutables-report.json文件，包含了K8s中各种资源的不可变字段，接着让opus生成一个常量配置

```
基于刚才生成的immutables-report.json中的不可变字段以及你对 Kubernetes 的专业知识（弥补自动化扫描可能漏掉的部分），请直接为我生成一份 TypeScript 常量配置。

要求：

定义一个对象 IMMUTABLE_PATHS。

Key 为资源 Kind (如 Deployment, Service)。

Value 为不可变字段的路径数组 (使用 lodash 风格的点分路径)。
```

```
编写一个 React Hook 或工具函数： isFieldEditable(kind: string, path: string, mode: 'create' | 'edit'): boolean

逻辑：

如果 mode === 'create'，永远返回 true。

如果 mode === 'edit'，检查 path 是否存在于 IMMUTABLE_PATHS[kind] 或 IMMUTABLE_PATHS['Common'] 中。

如果是 PVC 的 resources.requests.storage，这是一个特殊情况（只能变大），暂时标记为 true（可编辑），但在 UI 上添加注释 "Only expansion allowed"。
```

```
对一个恢复的组合，其中各个资源组件中，有很多字段是不允许修改的，根据前面的isFieldEditable方法，来设置资源中属性的可编辑状态。
UI 交互设计建议

在前端实现时，不要仅仅把 Input 设为 `disabled`，建议给用户明确的反馈：

1.  **视觉锁定**：将输入框置灰，并显示锁头图标 🔒。
2.  **Tooltip 提示**：当鼠标悬停在锁定的 Deployment Selector 上时，提示：
    > *"Field is immutable. To change this, you must delete and recreate the resource."*
    > *(此字段不可变。如需修改，请删除并重建资源。)*
3.  **特殊处理 (Recreate 模式)**：
    对于必须修改不可变字段的场景（例如重命名资源），你可以设计一个 "Clone & Recreate" 按钮：
    * 读取当前 YAML。
    * 清除 `metadata.resourceVersion`, `uid`, `creationTimestamp`。
    * 修改不可变字段。
    * 删除旧资源 -> 创建新资源 (注意这会导致服务中断，需给用户红色警告)。
```

```
遍历所有K8s中的所有资源和字段，对比immutables-report.json文件，对于不可变字段，添加LockedInput处理
```

```
1)对一个恢复的组合，如果添加新的组件，点击保存，应该不再需要填入组合名称（应该直接复用之前的组合名称），另外，应该只提交更新的部分（比如新增的组件，或之前组件的修改（修改应该调用patch接口）。
2）更新成功。但是点击删除资源，没有触发在K8s中的删除，需要修改。另外删除资源的时候，要判断下引用关系，比如configmap正在被Deployment引用，那configmap就不应该删除
3）删除功能正常，有个优化的地方，左侧边栏已保存的组合中，会显示某个组合中组件的数量，删除后，这个数量没有正确更新

```

# day 6.5 可维护性、云交付性提升

```
你是架构师，现在需要提升项目的可维护性和可交付性，请设计实现方案，至少包括增加控制台的日志输出、可配置的日志持久化、支持打包成docker等，并添加相关的配置和使用
有两个修改1）Dockerfile要支持多CPU架构编译。2）添加一个部署指导的文档，包括本地开发、docker-compose及K8s等方式
```


- 测试一下
```
我已经在本地load了镜像 kubecanvas:latest，我需要测试一下，请给出docker run的命令，并且通过环境变量传入token、apiserver地址和Namespace
```

- AI 给出的测试启动命令
```bash
# 读取现有配置
source .env.local
docker run -p 8080:80 \
  -e KUBERNETES_API_SERVER="$VITE_K8S_API_SERVER" \
  -e KUBERNETES_TOKEN="$VITE_K8S_TOKEN" \
  -e KUBERNETES_NAMESPACE="$VITE_K8S_NAMESPACE" \
  --rm \
  kubecanvas:latest
```

- 测试报错了，让AI修改下
```
docker日志报2026/01/14 14:09:17 [error] 11#11: *3 access forbidden by rule, client: 192.168.215.1, server: _, request: "GET /.well-known/appspecific/com.chrome.devtools.json HTTP/1.1", host: "localhost:8080"
```



# day 7 优化各种校验逻辑

```
优化下页面，在保留暗色风格的基础上，增加一个亮色风格，风格做成在配置文件中可以配置。此外，再检查下亮色风格和暗色风格下，是否页面上的所有元素都符合风格。
```

```
你是专业的UI设计师，为了让 KubeCanvas 的界面从“能用”升级到“专业、现代、美观”，我建议采用目前云原生领域最流行的 "Linear-style" 或 "Vercel-style" 设计语言：极简、高对比度、强调排版与间距、深色模式优先。
```

```
测试成功，有2个优化的点，1）连线可以删除，删除的时候要同步删除对应的关系 2）组件通过鼠标，弹出删除选项，选择删除 
```


```
前期实现的时候，漏了deamonset这个资源，参考deployment的实现，补充deamonset。
```

```
Gemini: 我已经实现了基本功能，现在需要进一步优化操作体验，通过前端的校验，避免一些错误操作。比如Service不应该关联（连线）Configmap，Secret不应该关联（连线）PVC，自己不应该关联自己等等，请梳理K8s中各种资源（包括Namespace、Deployment、StatefulSet、Deamonset、Pod、service、ingress、pvc、configmap、Secret、job、cronjob）之间的关联关系，建议以矩阵形式输出。
然后给出提示词，根据这个关系矩阵，对客户的连线操作提前进行校验。
```


```
# Role: Kubernetes Visual Editor Logic Expert

我正在开发 KubeCanvas 的连线功能。为了防止用户创建无效的 K8s 资源拓扑，我需要一个严格的连线校验逻辑。

设计 K8s 资源编辑器的“连线规则”是保证配置正确性的关键。在 Kubernetes 的语义中，资源之间的关系通常是单向依赖或**选择（Selection）**关系。为了防止用户创建“Service 连接 ConfigMap”这种无效拓扑，我们需要建立一张合法的邻接矩阵（Adjacency Matrix）。1. K8s 资源关联关系矩阵 (Allowlist)这张表定义了：当用户从 A (Source) 拖拽连线到 B (Target) 时，在 K8s 语义上代表什么关系。 如果不在表中，即为非法操作。
表格说明：
Source (起点)：依赖方 / 发起方
Target (终点)：被依赖方 / 被选择方
关系类型：
Selects: 标签选择器 (Label Selector)
Mounts/Env: 挂载卷或环境变量引用
Routes: 网络流量转发
Template: 模板包含


表格如下：
起点 (Source),终点 (Target),关系含义,对应 K8s 字段示例
Ingress,Service,路由转发,rules[].http.paths[].backend.service
Service,Deployment,流量选择,spec.selector 匹配 template.labels
Service,StatefulSet,流量选择,spec.selector 匹配 template.labels
Service,DaemonSet,流量选择,spec.selector 匹配 template.labels
Service,Pod,流量选择,spec.selector 匹配 metadata.labels
Deployment,PVC,挂载存储,spec.template.spec.volumes[].persistentVolumeClaim
Deployment,ConfigMap,挂载/注入,envFrom / volumes[].configMap
Deployment,Secret,挂载/注入,envFrom / volumes[].secret / imagePullSecrets
StatefulSet,PVC,挂载存储,spec.template.spec.volumes (亦可指代 ClaimTemplates)
StatefulSet,ConfigMap,挂载/注入,同 Deployment
StatefulSet,Secret,挂载/注入,同 Deployment
StatefulSet,Service,Headless服务,spec.serviceName (STS 特有字段)
DaemonSet,PVC / CM / Secret,挂载/注入,同 Deployment
CronJob,PVC / CM / Secret,挂载/注入,jobTemplate.spec.template...
Pod,PVC / CM / Secret,挂载/注入,spec.volumes
Job,PVC / CM / Secret,挂载/注入,spec.template...

2. 明确的非法操作 (Blocklist Rules)除了上述白名单，以下是必须在前端明确拦截的典型错误：
1）禁止自环 (Self-loop)：任何资源都不能连接自己（例如 Deployment A 不能连 Deployment A）。
2）禁止配置类资源互连：ConfigMap $\nrightarrow$ SecretSecret $\nrightarrow$ ConfigMapPVC $\nrightarrow$ ConfigMap
3）禁止反向依赖：Pod $\nrightarrow$ Service (Pod 是被 Service 选择的，虽然 Pod 可以访问 Service IP，但拓扑图上通常画作 Service -> Pod)。PVC $\nrightarrow$ Deployment (存储是被工作负载挂载的)。
4）禁止跨层级混乱：Ingress $\nrightarrow$ Pod (Ingress 必须指向 Service)。
```


```
在前端 UI 实现上，除了校验，增加以下视觉引导：

高亮可连接桩 (Port Highlighting)： 当你按住起始节点（如Deployment）的连线手柄开始拖拽时，只有合法的目标节点，如 Service/ ConfigMap/Secret/PVC (作为出站) 的节点高亮，其他无关节点（如 Ingress 或其他 Deployment）变暗或通过 CSS pointer-events: none 禁用。


```

- 求助一下Gemini

```
Gemini: 我已经完成了基本功能，需要对项目进行整体检查，增加对组件（包括Namespace、Deployment、StatefulSet、Deamonset、Pod、service、ingress、pvc、configmap、Secret、job、cronjob）操作的各种校验，
校验 组件连线关联的时候，是否无论从哪个方向连线，都能通过设置Selector、volume等方式进行实际资源的关联。
校验删除连线的时候，这些关联能正确删除。
校验对恢复的组合中的组件进行修改的时候，是否不允许修改的字段，都已经设置成只读。
校验对恢复的组合中的组件进行删除的时候，是否有关联组件，需要先删除关联组件，才允许删除（需要弹出提示）
校验namespace删除的时候，是否有把namespace内部所有组件也都删除（需要弹出提示，让用户二次确认）
校验新建场景下，组件删除的时候，已经有的连线和关联关系（如Selector、volume等）也正确删除

请为我生成Prompt
```



```
在 patch/update 时的不可变字段深度梳理：
1. 核心原则 (通用规则)
对于所有 K8s 资源，以下 Metadata 字段一旦创建，通常是绝对不可修改的：
metadata.name: 资源名称。
metadata.uid: 唯一标识符。
metadata.creationTimestamp: 创建时间。
metadata.namespace: 所属命名空间。
2. 工作负载 (Workloads)
这部分是最容易踩坑的，特别是 Deployment 和 StatefulSet 的区别。
Pod
Pod 被设计为相对“临时”的资源，其规范 (spec) 大部分是不可变的。
不可修改字段 (Immutable):
spec 下的绝大多数配置，例如：
spec.containers[*].ports
spec.containers[*].resources (CPU/Memory Request/Limit) 注：K8s v1.27+ 引入了 In-place Update Alpha 特性，但在标准生产环境中通常仍视为不可变。
spec.containers[*].env
spec.volumes
spec.nodeName (一旦调度，不可修改)
允许修改字段 (Mutable):
spec.containers[*].image (这是最常用的修改)
spec.activeDeadlineSeconds
spec.tolerations (仅当之前未设置时可添加，部分情况受限)
Deployment
不可修改字段 (Immutable):
spec.selector: 这是大坑。在 apps/v1 版本中，Label Selector 是不可变的。你不能更改 Deployment 纳管 Pod 的标签规则，除非删除重建。
允许修改字段 (Mutable):
spec.template: 修改模板会触发滚动更新 (Rolling Update)。
spec.replicas
spec.strategy
StatefulSet
StatefulSet 对状态要求极高，因此限制比 Deployment 更多。
不可修改字段 (Immutable):
spec.selector: 标签选择器。
spec.volumeClaimTemplates: 极易踩坑。一旦创建，你不能修改存储卷的大小、StorageClass 等。若需扩容，需手动处理 PVC 或删除 StatefulSet（保留 Pod）后重建。
spec.serviceName: 用于生成 DNS 的 Headless Service 名称。
spec.podManagementPolicy
允许修改字段 (Mutable):
spec.template (触发滚动更新)
spec.replicas
DaemonSet
不可修改字段 (Immutable):
spec.selector
允许修改字段 (Mutable):
spec.template
spec.updateStrategy
Job
Job 是一次性任务，设计上不期望被修改。
不可修改字段 (Immutable):
spec.template: 注意！ 与 Deployment 不同，Job 的 Pod 模板是不可变的。你不能更改正在运行或已完成 Job 的镜像。
spec.selector
spec.completions
spec.parallelism (但在某些版本通过 patch 可能是允许动态调整的，取决于具体 K8s 版本，通常不建议改)
CronJob
CronJob 是生成 Job 的控制器。
不可修改字段 (Immutable):
无特殊限制。CronJob 主要是元数据配置。
注意: 修改 spec.jobTemplate 里的字段是允许的，但这只会影响下一次触发的 Job，不会影响当前正在运行的 Job。
3. 网络资源 (Networking)
Service
不可修改字段 (Immutable):
spec.clusterIP: 除非你将其显式设置为 None (变 Headless) 或从 None 改回。你不能直接把 IP 从 10.96.0.1 改成 10.96.0.2。
spec.ipFamilies: (双栈网络相关) 通常不可变。
spec.selector: 注意，Service 的 Selector 是可以修改的（用于流量切换），但这一行为虽然合法，却要谨慎使用。
特殊情况:
spec.type: 可以修改（如 ClusterIP -> NodePort），但不能非法转换（如 ExternalName 转 ClusterIP 可能会受限）。
Ingress
Ingress 相对灵活，绝大多数字段（spec.rules, spec.tls, spec.ingressClassName）在符合规范的前提下都是允许修改的，Controller 会实时重新加载配置（如 Nginx Reload）。
4. 存储与配置 (Storage & Config)
PersistentVolumeClaim (PVC)
PVC 的修改限制非常严格，因为它绑定了物理存储。
不可修改字段 (Immutable):
spec.storageClassName: 必须在创建时指定，之后不可改。
spec.accessModes: (如 ReadWriteOnce 改为 ReadWriteMany) 通常不可改。
spec.volumeName: 绑定的 PV 名称。
spec.selector: 绑定的标签选择器。
例外:
spec.resources.requests.storage: 仅允许增加（扩容），且需要 StorageClass 支持 AllowVolumeExpansion。绝不允许减小。
ConfigMap / Secret
Data 内容: data 和 binaryData 字段是完全可修改的。
不可修改字段: 主要是 Metadata。
专家提示: 修改 ConfigMap/Secret 不会自动触发 Pod 重启（除非 Pod 也是通过某些 Operator 管理或应用自身监听了文件变化）。通常需要重建 Pod 才能挂载新的配置。
Namespace
不可修改字段 (Immutable):
metadata.name: 命名空间名称绝对不可改。
允许修改: Labels, Annotations, ResourceQuota 关联等。

```

```
从保存的组合中恢复的时候，有些连线没有恢复，请统一检查一遍各组件之间的连线恢复逻辑

```

```
我对一个恢复的组合，测试了删除其中一条连线，比如configmap到job的连线，测试发现点击“保存更新”正常，也提示“更新了一个组件”，但是实际上时没有更新的，下次恢复的时候，还是恢复了这条连线，请检查该问题，并排查同类问题
```

- 在修复一个弹不出提示的问题时，反复修改都没解决，人工给他一些思路
```


还是弹不出，能看到“部分失败：0 成功，1 失败”，是否是这个提示覆盖了“不可修改”的提示

```

- AI给出了回答，这次修复了问题（看来有时候还得看人的经验）
```
是的！第二个 toast "部分失败：0 成功，1 失败" 覆盖了第一个 "不可修改" 的提示。让我修复这个问题：
```



```
几个问题需要修复
1）用docker 镜像在K8s中启动的时候，控制台报index-De-wTvJU.js:31  In-cluster mode failed, falling back to custom config ，但实际是In-cluster mode
2）UI_THEME 默认改成light，用docker启动的时候，也要给出可以修改UI_THEME的方法，并补充到部署文档中（建议把env.local的配置写到一个配置文件中，然后允许通过configmap来挂载这个配置）
3）通过已保存的组合恢复后，如果删除namespace，虽然前端提示删除成功，但实际上namespace没有在K8s中删除，Namespace中的资源也没有在K8s中删除
4）部署文档中，增加nodeport启动方式的介绍，我已经补充配置文件到deploy/03-service-nodeport.yaml中了
5）用docker 镜像启动后，看不到和后端K8s集群交互的日志
```

# day 8 bug修复、资源属性字段优化

```
资源下属的字段和关系，还不太正确，比如应该是如下关系Deployment->spec（DeploymentSpec）->template(PodTemplateSpec)->spec(PodSpec)->containers 。请重新梳理属性字段之间的关系，另外还有一些缺少的字段，比如initcontainer之类的
```

# day 9 优化布局

```
当前如果保存了很多组合，将在页面上呈现一个很长的列表，请优化页面设计，以更好的形式呈现保存的组合
```

```
根据docs/tasks/020-k8s-resource-field-restructure.md总结，再自己检查一遍资源属性编辑面板是否还有遗漏的字段没有在页面上程序，例如securityContext等。另外，containers下除了cpu、内存以外，要增加GPU作为可选配置
```

```
修复2个问题：1）当恢复一个保存的组合，如果用按“backspace”按键删除所有资源组件，然后保存时，无法触发后端的删除操作，只会提示“画布为空，请先添加资源” 2）如果在资源组件上，右键点击，然后删除，则可以触发删除，但是控制台有报错
```