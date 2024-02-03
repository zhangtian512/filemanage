<template>
  <div class="tb-card">
    <div class="tb-card-header">
        <div  v-if="title" class="tb-card-header-title">
            {{title}}
        </div>
        <div v-if="!title">
            <slot name="title"></slot>
        </div>
        <div class="tb-card-header-end">
            <slot name="titleRight"></slot>
        </div>
    </div>
    <div class="tb-card-body">
        <slot></slot>
    </div>
    <div v-if="showFooter" class="tb-card-footer">
        <slot name="footer"></slot>
    </div>
  </div>
</template>
<script>
export default {
props:{
    title:{type:String,default:''},
    showFooter:{type:Boolean,default:true},
},
}
</script>
<style lang="scss" scoped>
div{
    box-sizing: border-box;
}
.tb-card{
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    // background-color: var(--c_white_dark);
    background-color: #fff;
    box-sizing: border-box;
    padding: 0px 20px;
    overflow: hidden;
    &-header{
        height: 70px;
        flex-shrink: 0;
        flex-grow: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        font-size: 21px;
        line-height: 21px;
        &-title {
            color: var(--c_black);
        }
        &-end{
            display: flex;
            align-items: center;
        }
    }
    &-body{
        width: 100%;
        flex: 1;
        overflow: auto;
        position: relative;
        /deep/ .el-table__fixed-header-wrapper {
            // background-color: var(--c_gray_highlight_text);
            background-color: rgb(221,231,243);
            // border-bottom: 2px solid var(--c_blue_dark);
            border-bottom: 1px solid rgb(214,221,231);
            border-top: 1px solid rgb(214,221,231);
            tr{
                height: 50px !important;
            }
            th{
                font-weight: bold;
                font-size: 16px;
                // color: var(--c_oee_text);
                color: rgb(98,104,104);
                // background-color: var(--c_gray_highlight_text);
                background-color: rgb(221,231,243);
            }
        }
        /deep/ .el-table__header-wrapper{
            // background-color: var(--c_gray_highlight_text);
            background-color: rgb(221,231,243);
            // border-bottom: 2px solid var(--c_blue_dark);
            border-bottom: 1px solid rgb(214,221,231);
            border-top: 1px solid rgb(214,221,231);
            tr{
                height: 50px !important;
            }
            th{
                font-weight: bold;
                font-size: 16px;
                // color: var(--c_oee_text);
                color: rgb(98,104,104);
                // background-color: var(--c_gray_highlight_text);
                background-color: rgb(221,231,243);
            }
        }
        /deep/ .el-table__body-wrapper::-webkit-scrollbar {
            width: 12px;
            background-color: var(--c_white);
        }
        /deep/ .el-table__body-wrapper::-webkit-scrollbar-thumb {
            border-radius: 8px;
            // background-color: var(--c_webkit-scrollbar-thumb);
            background-color: rgb(213,222,231);
        }
        /deep/ .el-table{
            color: var(--c_oee_text);
            font-size: 16px;
            tr{
                height: 56px;
                td{
                    // border-bottom: 1px solid var(--c_gray);
                    border-bottom: 1px solid rgb(214,221,231);
                }
            }
            .el-table__row.hover-row{
                background-color: var(--c_bg_blue);
                &>td.el-table__cell{
                    background-color: var(--c_bg_blue);
                }
            }
            .el-table__row:hover{
                background-color: var(--c_bg_blue);
                &>td.el-table__cell{
                    background-color: var(--c_bg_blue);
                }
            }
            .el-table__row--striped td.el-table__cell{
                background-color: rgb(239,244,248);
            }
            .el-table__row--striped:hover{
                background-color: var(--c_bg_blue);
                &>td.el-table__cell{
                    background-color: var(--c_bg_blue);
                }
            } 
            .el-table__body tr.current-row>td.el-table__cell{
                background-color: var(--c_bg_blue);
            }
            .el-table__cell {
                padding: 0px;
                .cell {
                    box-sizing: border-box;
                    // padding: 0px 16px;
                    line-height: 34px;
                    // display: flex;
                    // align-items: center;
                }
            }
            .el-table-column--selection .cell {
                padding: 0px 0px 0px 16px;
                // display: flex;
                // justify-content: center;
            }
            .caret-wrapper {
                height: 33px;
            }

            .el-checkbox__input.is-checked .el-checkbox__inner, .el-checkbox__input.is-indeterminate .el-checkbox__inner {
                // background-color: var(--c_blue);
                background-color: rgb(19,167,167);
                // border-color: var(--c_blue);
                border: none;
            }
            .el-checkbox__inner{
                // border: 2px solid var(--c_oee_text);
                border: 1px solid rgb(214,221,231);
                border-radius: 4px;
                width: 18px;
                height: 18px;
            }
            .el-checkbox__input.is-disabled .el-checkbox__inner {
                // border: 2px solid var(--c_gray);
                border: 1px solid var(--c_gray);
                background-color: rgba(255,255,255,0);
            }
            .el-checkbox__input.is-indeterminate .el-checkbox__inner::before {
                content: '';
                position: absolute;
                display: block;
                background-color: var(--c_white);
                height: 4px;
                -webkit-transform: scale(.5);
                transform: scale(.5);
                left: 0;
                right: 0;
                top: 7px;
            }
            .el-checkbox__inner::after{
                box-sizing: content-box;
                content: "";
                border: 2px solid var(--c_white);
                border-left: 0;
                border-top: 0;
                height: 8px;
                left: 6px;
                position: absolute;
                top: 3px;
                width: 3px;
                transform-origin: center;
            }                      
        }           
    }
    &-footer{
        width: 100%;
        flex-shrink: 0;
        flex-grow: 0;
        height: 60px;
        display: flex;
        justify-content: space-between;
        border-top: 1px solid var(--c_gray);
        align-items: center;
        padding: 0 15px;
        /deep/ .el-pagination{
            width: 100%;
            display: flex;
            align-items: center;
            padding: 0px;
            font-size: 16px;
            .el-pagination__total {
                font-size: 18px;
                font-weight: 700;
                color: rgb(98,104,104);
            }
            .el-pagination__sizes{
                // flex:1;
                display: flex;
                align-items: center;
                .el-select {
                    width: 103px;
                    height: 32px;
                    .el-input {
                        width: 98px;
                        height: 32px;
                        margin: 0px;
                        .el-input__inner{
                            height: 32px;
                            border: 1px solid rgb(212,222,231);
                            border-radius: 4px;
                            font-size: 16px;
                            // font-weight: 700;
                            color: #000;
                            text-align: left;
                        }
                        .el-icon-arrow-up:before {
                            content: "\e78f";
                            color: var(--c_oee_text);
                        }
                    }
                }
            }
            .btn-prev {
                margin-right: 5px;
            }
            .btn-next {
                margin-left: 5px;
            }
            .btn-prev,.btn-next{
                height: 32px;
                // background-color: var(--c_gray_light);
                border: 1px solid rgb(212,222,231);
                border-radius: 6px;
                color: rgb(18,95,177);
                padding: 0px;
                .el-icon {
                    font-size: 24px;
                }
                .el-icon-arrow-left:before {
                    content: "\e792";
                    color: rgb(18,95,177);
                }
                .el-icon-arrow-right:before {
                    content: "\e791";
                    color: rgb(18,95,177);
                }
            }
            .el-pager li{
                height: 32px;
                line-height: 32px;
                font-size: 18px;
                border: 1px solid rgb(212,222,231);
                border-radius: 6px;
                margin: 0px 5px;
            }
            .el-pager li.active {
                border: none;
                background-color: rgb(18,95,177);
                color: #fff;
            }
            .el-pagination__jump {
                font-size: 18px;
                font-weight: 700;
                color: rgb(98,104,104);
                .el-input {
                    width: 32px;
                    height: 32px;
                    margin: 0px 8px;
                    .el-input__inner {
                        width: 32px;
                        height: 32px;
                    }
                }
            }
            // &.is-background .el-pager li:not(.disabled).active{
            //     background-color: var(--c_blue);
            // }
        }        
    }    
}
</style>