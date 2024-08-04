<script setup>
    import { ref, reactive } from 'vue';
    import TreeNode from './tree/TreeNode.vue'
    import defaultImage from '../../public/link.png'
    import { message } from 'ant-design-vue';
    import axios from 'axios'
    const data = reactive({
        bookmarks: [],  // 收藏夹数据目录树
        select_bookmarks: [],  //当前选中节点的数据
        tabs: [],  // 当前浏览器打开的tab页
        recent: [],  // 最近打开过的
        search_input: '',  //搜索框文本
        search_data: [],  //搜索到的内容
        search_show: false,   //搜索结果是否显示
        subscribe: [], // 订阅源
        subscribe_data: [],  // 打开订阅后显示的数据
        subscribe_show: false,  // 订阅弹窗显示隐藏
        subscribe_crumbs: [],  // 订阅弹窗里的面包屑
        subscribe_add_show: false,  // 添加订阅弹窗的显示隐藏
        subscribe_src: ''  // 添加订阅链接暂存
    })


    // 获取收藏夹数据
    chrome.bookmarks.getTree(function (bookmarkTreeNodes) {
        data.bookmarks = transformBookmarkTree(bookmarkTreeNodes)[0].children
        selectedNode.value = transformBookmarkTree(bookmarkTreeNodes)[0].children[0].key
        data.select_bookmarks = transformBookmarkTree(bookmarkTreeNodes)[0].children[0]
    });


    // 获取当前浏览器打开的tab页
    chrome.tabs.query({}, function (tabs) {
        data.tabs = tabs
    })

    // 获取最近打开过的
    chrome.history.search({ text: '', maxResults: 10 }, function (historyItems) {

        data.recent = historyItems.map((e) => {
            return {
                title: e.title,
                url: e.url,
                windowId: e.windowId,
                id: e.id,
                icon: 'https://logo.clearbit.com/' + new URL(e.url).hostname
            }
        })
        // console.log(data.recent)
    });


    // 遍历生成新的收藏标签
    function transformBookmarkTree(bookmarks) {
        // 递归遍历和转换书签节点
        function generateNewBookmark(node) {
            // 确定节点类型，若有 children 则为 'file'，否则为 'link'
            const type = node.children && Array.isArray(node.children) ? 'file' : 'link';

            // 创建新的节点对象
            const newNode = {
                title: node.title || '',
                url: node.url || '',  // 若不存在 URL 则设为空字符串
                icon: node.url ? 'https://logo.clearbit.com/' + new URL(node.url).hostname : '',
                key: node.id,
                type: type,
                children: []
            };

            // 递归处理子节点（若当前节点是 'file' 类型）
            if (type === 'file') {
                newNode.children = node.children.map(child => generateNewBookmark(child));
            }

            return newNode;
        }

        // 处理整个书签数组
        return bookmarks.map(bookmark => generateNewBookmark(bookmark));
    }


    // 点击收藏夹节点切换
    const selectedNode = ref(null);
    function handleNodeClick(node) {
        console.log(node)
        data.select_bookmarks = node
        selectedNode.value = node.key;
    }


    // 点击跳转到tab页
    function tabs_open(tab) {
        chrome.windows.update(tab.windowId, { focused: true }, function () {
            chrome.tabs.update(tab.id, { active: true });
        });
    }

    // 点击打开网页
    function link_open(url) {
        chrome.tabs.create({ url: url });
    }


    // 收藏夹模糊搜索
    function search() {
        if (data.search_input != '') {
            data.search_show = true
        } else {
            data.search_show = false
        }
        data.search_data = searchBookmarks(data.bookmarks, data.search_input)
        // console.log(searchBookmarks(data.bookmarks, data.search_input))
    }


    // 对书签执行模糊搜索
    function searchBookmarks(bookmarks, query) {
        let results = [];

        function searchNode(node) {
            if (node.url && node.title.toLowerCase().includes(query)) {
                results.push({ title: node.title, url: node.url, icon: node.icon });
            }
            if (node.children) {
                node.children.forEach(searchNode);
            }
        }

        bookmarks.forEach(searchNode);
        return results;
    }


    // 导出书签
    function export_bookmarks() {
        // 导出成json文件下载
        const a = document.createElement('a');
        const bookmarks = JSON.stringify(data.select_bookmarks);
        const blob = new Blob([bookmarks], { type: 'text/plain' });
        a.href = URL.createObjectURL(blob);
        a.download = data.select_bookmarks.title + '.json';
        a.click();
    }

    // 请求订阅源
    function generateNewBookmark(e) {
        data.subscribe_show = true
        axios.get('https://tagplanet.zhuayuya.com/proxy?endpoint=' + e.src)
            .then(function (response) {
                // console.log(response.data)
                data.subscribe_crumbs = []
                data.subscribe_data = response.data
                data.subscribe_crumbs.push(response.data)
            })
    }

    // 订阅层级点击
    function subscribe_click(node) {
        data.subscribe_crumbs.push(node)
        data.subscribe_data = node
    }

    // 面包屑点击
    function subscribe_crumbs(node, index) {
        data.subscribe_data = node
        // 删除此数组后方的所有对象
        data.subscribe_crumbs.splice(index + 1)
    }


    // 确定添加订阅源
    function handleOk() {
        // 判断文本是否是.json结尾
        if (!data.subscribe_src.endsWith('.json')) {
            message.info('请输入正确的订阅源链接')
            return
        }

        if (!/^https?:\/\//.test(data.subscribe_src)) {
            message.info('请输入正确的订阅源链接')
            return
        }

        // console.log(data.subscribe_src)
        axios.get('https://tagplanet.zhuayuya.com/proxy?endpoint=' + data.subscribe_src)
            .then(function (response) {
                console.log(response.data)
                if (response.data.title) {
                    data.subscribe.push(
                        {
                            title: response.data.title,
                            time: new Date().toLocaleString(),
                            src: data.subscribe_src
                        }
                    )

                    data.subscribe_add_show = false
                    data.subscribe_src = ''
                    subscribe_save()
                }
            })
            .catch(function (error) {
                message.error('请输入正确的订阅链接')
            })
    }


    // 删除订阅源节点
    function subscribe_delete(index) {
        data.subscribe.splice(index, 1)
        subscribe_save()
    }

    // 订阅源保存到本地
    function subscribe_save() {
        localStorage.setItem('subscribe', JSON.stringify(data.subscribe))
    }

    // 初始化加载订阅源
    subscribe_init()
    function subscribe_init() {
        let subscribeInit = JSON.parse(localStorage.getItem('subscribe'))
        if (subscribeInit) {
            data.subscribe = subscribeInit
        }
    }
</script>

<template>
    <div v-if="data.subscribe_show" @click="data.subscribe_show = false" class="popup">
        <div @click.stop class="popup-content">
            <h1>我的订阅</h1>
            <div class="crumbs">
                <span @click="subscribe_crumbs(item,index)" v-for="(item, index) in data.subscribe_crumbs" :key="index">
                    {{ item.title }} /
                </span>
            </div>

            <div class="group">
                <ul>
                    <template v-for="(item, index) in data.subscribe_data.children" :key="index">
                        <li @click="subscribe_click(item)" v-if="item.type === 'file'">
                            <i>📂</i>
                            <span>{{item.title}}</span>
                        </li>
                    </template>

                </ul>
            </div>

            <div class="links">
                <ul>
                    <template v-for="(item, index) in data.subscribe_data.children" :key="index">
                        <li @click="link_open(item.url)" v-if="item.type === 'link'">
                            <img :src="item.icon || defaultImage" @error.once="e => { e.target.src = defaultImage }"
                                alt="">
                            <div>
                                <h3>{{ item.title }}</h3>
                                <p>{{ item.url }}</p>
                            </div>

                        </li>
                    </template>

                </ul>
            </div>
        </div>
    </div>

    <a-modal v-model:open="data.subscribe_add_show" title="添加订阅源" cancelText="取消" okText="确定" @ok="handleOk">
        <a-input placeholder="请输入订阅源地址，包含http部分" v-model:value="data.subscribe_src" />
    </a-modal>


    <div class="container">
        <div class="app-left">
            <div class="logo">
                <img src="/public/logo.svg" alt="">
            </div>
            <div class="tree">
                <TreeNode v-for="node in data.bookmarks" :key="node.key" :node="node"
                    :is-selected="selectedNode === node.key" :selected-node="selectedNode"
                    @node-clicked="handleNodeClick">

                </TreeNode>
            </div>
        </div>

        <div class="app-right">
            <div class="header">
                <div class="search">
                    <input @input="search" v-model="data.search_input" type="text" placeholder="Search...">
                    <div v-if="data.search_show" class="search-popup">
                        <ul>
                            <li @click="link_open(item.url)" v-for="(item, index) in data.search_data">
                                <img :src="item.icon || defaultImage" @error="e => { e.target.src = defaultImage }"
                                    alt="">
                                <span>{{ item.title }}</span>
                            </li>

                        </ul>

                    </div>
                </div>
                <div class="menu">
                    <a target="_blank"
                        href="https://home.zhuayuya.com/docs/%E6%A0%87%E7%AD%BE%E6%98%9F%E7%90%83.html">官网</a>
                    <a target="_blank"
                        href="https://home.zhuayuya.com/docs/%E6%A0%87%E7%AD%BE%E6%98%9F%E7%90%83%E5%8F%8D%E9%A6%88.html">反馈</a>
                </div>
            </div>

            <div class="content">
                <div class="left">

                    <!-- 最近打开 -->
                    <div class="recently-opened">
                        <h1>最近打开过</h1>
                        <ul>
                            <li @click="link_open(item.url)" v-for="(item, index) in data.recent" :key="index">
                                <img :src="item.icon || defaultImage" @error="e => { e.target.src = defaultImage }"
                                    alt="">
                                <span>{{ item.title }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- 当前选中的收藏夹链接 -->
                    <div class="current-folder-link">

                        <!-- 订阅 -->
                        <div class="subscribe">

                            <template v-for="(item, index) in data.subscribe" :key="index">
                                <a-dropdown :trigger="['contextmenu']">
                                    <div class="subscribe-item" @click="generateNewBookmark(item)">
                                        <i>🏜️</i>
                                        <span>{{item.title}}</span>
                                    </div>

                                    <template #overlay>
                                        <a-menu>
                                            <a-menu-item key="1" @click="subscribe_delete(index)">🗑️ 删除</a-menu-item>
                                        </a-menu>
                                    </template>
                                </a-dropdown>
                            </template>

                        </div>

                        <div class="current-folder-header">
                            <h1>收藏栏链接</h1>
                            <div>
                                <span @click="data.subscribe_add_show = true">🏜️ 订阅</span>
                                <span @click="export_bookmarks" style="margin-left: 8px">📥导出</span>

                            </div>
                        </div>

                        <ul>
                            <template v-for="(item, index) in data.select_bookmarks.children">
                                <li @click="link_open(item.url)" v-if="item.type === 'link'" :key="index">
                                    <img @error.once="e => { e.target.src = defaultImage }"
                                        :src="item.icon || defaultImage" alt="">
                                    <div>
                                        <h3>{{ item.title }}</h3>
                                        <p>{{ item.url }}</p>
                                    </div>
                                </li>
                            </template>

                        </ul>
                    </div>
                </div>

                <div class="right">
                    <h1>当前浏览器Tabs</h1>

                    <ul>
                        <li @click="tabs_open(item)" v-for="(item, index) in data.tabs" :key="index">
                            <img :src="item.favIconUrl || defaultImage"
                                @error.once="e => { e.target.src = defaultImage }" alt="">
                            <span>{{ item.title }}</span>
                        </li>
                    </ul>

                </div>
            </div>
        </div>

        <!-- <div class="wallpper">
        <img src="https://img.zhuayuya.com/wallpaper/img/two/img/wallpa_img_1378.jpg" alt="">

    </div> -->
    </div>
</template>

<style scoped>
    .subscribe-item span {
        font-size: 13px;
        margin-left: 5px;
        color: #333;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .subscribe-item {
        width: 128px;
        height: 38px;
        border: 1px solid #ececec;
        display: flex;
        align-items: center;
        padding: 10px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s;
        margin-right: 10px;
    }

    .subscribe-item:hover {
        background: #f1f1f1;
    }

    .subscribe {
        margin-bottom: 18px;
        display: flex;
    }

    .crumbs span {
        font-size: 13px;
        color: #919191;
        cursor: pointer;
    }

    .crumbs span:hover {
        font-size: 13px;
        color: #333;
        text-decoration: underline;
    }

    .crumbs {
        margin-bottom: 18px;
    }

    .group ul li span {
        display: block;
        font-size: 13px;
        color: #333;
        margin-top: 16px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .group ul li i {
        font-size: 50px;
    }

    .group ul li {
        width: 88px;
        height: 88px;
        margin-right: 6px;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: all 0.2s;
    }

    .group ul li:hover {
        background: #f1f1f1;
    }

    .group ul {
        display: flex;
        width: 100%;
        overflow: auto;
    }

    .popup-content h1 {
        margin: 0;
        margin-bottom: 20px;
    }

    .links img {
        width: 38px;
        height: 38px;
        margin-left: 16px;
        border-radius: 50px;
        object-fit: cover;
    }

    .links ul li p {
        width: 120px;
        font-size: 14px;
        color: #999999;
        line-height: 20px;
        font-weight: 300;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        margin-left: 10px;
    }

    .links ul li h3 {
        width: 120px;
        font-size: 15px;
        line-height: 20px;
        margin-bottom: 6px;
        margin-left: 10px;
        /* 省略 */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .links ul li {
        width: 100%;
        height: 80px;
        border-radius: 12px;
        background: rgba(255, 255, 255, .6);
        backdrop-filter: blur(8px);
        box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.2);
        list-style: none;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s;
    }

    .links ul li:hover {
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
    }

    .links ul {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        /* 自适应数量 */
        grid-gap: 22px;
        padding-inline-start: 0;
        padding: 3px;
        overflow: auto;
        margin-top: 20px;
    }

    .group img {
        width: 58px;
        height: 58px;
        object-fit: cover;
    }

    .popup-content {
        width: 50%;
        height: 600px;
        border-radius: 10px;
        background: #fff;
        overflow: auto;
        padding: 20px;
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
    }

    /* 滚动条样式 */
    .popup-content::-webkit-scrollbar {
        display: none;
    }

    .popup {
        position: fixed;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.2);
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .wallpper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .wallpper {
        width: 100%;
        height: 100%;
        position: absolute;
        z-index: -1;
        overflow: hidden;
    }

    .current-folder-header h1 {
        margin: 0;
    }

    .current-folder-header span {
        color: #333;
        font-size: 15px;
        padding: 3px 6px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .current-folder-header span:hover {
        background: #00a6ed;
        color: #fff;
    }

    .current-folder-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .search-popup li img {
        width: 18px;
        height: 18px;
        border-radius: 3px;
    }

    .search-popup li span {
        font-size: 14px;
        color: #333;
        margin-left: 10px;
        /* 省略 */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;

    }

    .search-popup li {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        margin-top: 20px;
        cursor: pointer;
    }

    .search-popup li:hover {
        text-decoration: underline;
    }

    .search-popup {
        position: absolute;
        z-index: 1;
        margin-top: 10px;
        width: 300px;
        max-height: 380px;
        overflow: auto;
        background: #fff;
        border-radius: 5px;
        padding: 0 16px;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    }

    .tree {
        margin-top: 10px;
        padding: 15px;
    }

    .right ul li span {
        width: 188px;
        display: block;
        font-size: 14px;
        color: #333;
        font-weight: 300;
        margin-left: 10px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        text-shadow: 0px 0px 5px rgba(255, 255, 255, 1);
    }

    .right ul li img {
        width: 18px;
        height: 18px;
        object-fit: cover;
        border-radius: 5px;
    }

    .right ul li {
        height: 32px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        padding: 1px 6px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s;
    }

    .right ul li:hover {
        background: #f1f1f1;
    }

    .right ul {
        margin-left: 16px;
        margin-top: 20px;
    }

    .right h1 {
        margin-left: 16px;
    }

    .right {
        height: calc(100vh - 60px);
        overflow: auto;
    }

    .current-folder-link ul li p {
        width: 120px;
        font-size: 14px;
        color: #999999;
        line-height: 20px;
        font-weight: 300;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .current-folder-link ul li h3 {
        width: 120px;
        font-size: 15px;
        line-height: 20px;
        margin-bottom: 6px;
        /* 省略 */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .current-folder-link ul li div {
        margin-left: 16px;
    }

    .current-folder-link ul li img {
        width: 38px;
        height: 38px;
        margin-left: 16px;
        border-radius: 50px;
    }

    .current-folder-link ul li {
        width: 100%;
        height: 80px;
        border-radius: 12px;
        background: rgba(255, 255, 255, .6);
        backdrop-filter: blur(8px);

        box-shadow: 0px 0px 2px rgba(0, 0, 0, 0.2);
        list-style: none;
        display: flex;
        align-items: center;
        cursor: pointer;
        transition: all 0.3s;
    }

    .current-folder-link ul li:hover {
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
    }

    .current-folder-link ul {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        /* 自适应数量 */
        grid-gap: 22px;
        padding-inline-start: 0;
        padding: 3px;
        overflow: auto;
        margin-top: 20px;
    }

    .current-folder-link {
        margin: 20px;
    }

    .recently-opened ul li img {
        width: 50px;
        height: 50px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid #f1f1f1;
    }

    .recently-opened ul li span {
        width: 100%;
        display: block;
        font-size: 13px;
        color: #333;
        margin-top: 5px;
        /* 省略 */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;

    }

    .recently-opened ul li {
        width: 58px;
        /* background: #f1f1f1; */
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 10px;
        cursor: pointer;
        transition: transform 0.2s ease-in-out;
    }

    .recently-opened ul li:hover {
        transform: translateY(-5px);
    }

    .recently-opened ul {
        width: 100%;
        overflow-y: auto;
        height: 88px;
        margin-top: 8px;
        /* background: #999999; */
        display: flex;
        align-items: center;
    }

    .recently-opened {
        margin-left: 20px;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f1f1f1;
    }

    h1 {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-top: 28px;
    }

    .left {
        width: calc(100% - 260px);
        border-right: 1px solid #f1f1f1;
        height: calc(100vh - 60px);
        overflow: auto;
    }

    .content {
        display: flex;
    }

    .menu a {
        margin-right: 22px;
        color: #333;
        font-size: 14px;
        text-decoration: none;
    }

    .menu a:hover {
        text-decoration: underline;
    }

    .search input {
        width: 300px;
        padding: 12px;
        font-size: 14px;
        border: none;
        outline: none;
        border-radius: 5px;
        background: rgba(255, 255, 255, .2);
        backdrop-filter: blur(8px);
    }

    .search {
        margin-left: 20px;
    }

    .header {
        height: 60px;
        width: 100%;
        box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .app-right {
        width: calc(100% - 220px);
    }

    .logo img {
        width: 180px;
    }

    .logo {
        width: 100%;
        height: 60px;
        /* background: #f1f1f1; */
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .app-left {
        width: 220px;
        height: 100vh;
        border-right: 1px solid #f1f1f1;
        overflow: auto;
    }

    .app-right {}

    .container {
        display: flex;
    }
</style>