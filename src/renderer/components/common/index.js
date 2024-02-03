import Tooltip from "./Tooltip.vue"
import Dialog from "./Dialog.vue"
import ContextMenu from "./ContextMenu.vue"
import TableCard from "./TableCard.vue"
import Button from "./Button.vue"
import Progress from './Progress.vue'

export default {
    install(Vue){
        Vue.component('Tooltip',Tooltip)
        Vue.component('Dialog', Dialog)
        Vue.component('ContextMenu',ContextMenu)
        Vue.component('TableCard',TableCard)
        Vue.component('Button',Button)
        Vue.component('Progress',Progress)
    }
}