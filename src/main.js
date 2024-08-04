import { createApp } from 'vue'
import App from './App.vue'
import { Tree, Modal, Input, Button, Dropdown, Menu } from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './style.css'

const app = createApp(App);
app.use(Tree)
app.use(Modal)
app.use(Input)
app.use(Button)
app.use(Dropdown)
app.use(Menu)


app.use().mount('#app')
