<template>
  <div v-if="show">
    <div class="mu-mask" :style="{zIndex: zIndex-1}"></div>
    <div class="mu-dialog" :style="{zIndex: zIndex}">
        <div v-loading="loading" class="mu-dialog-cont" :style="{width:width?`${width}px`:'auto',height:`${height?height+'px':'auto'}`}">
            <div v-if="title" class="mu-dialog-header">
                <div class="mu-dialog-title">
                    <div>
                        <div class="title-txt">
                            {{title}}
                        </div>
                        <div v-if="required" class="mu-dialog-title-require">
                            * 必填
                        </div>        
                    </div> 
                    <div v-if="showClose" class="mu-dialog-btn-close" @click="onClose"></div>
                </div>
                <div v-if="tips" class="title-tips">{{tips}}</div>                
            </div>
            <div class="mu-dialog-content">
                <slot></slot>
            </div>
            <div class="mu-dialog-footer" v-if="!hideFooter">
                <div v-if="showDefaultFooterContent" style="display:flex;height:100%">
                    <div class="txt-btn txt-btn-cancel" @click="onCancel">取消</div>
                    <div :class="['txt-btn',!enableSave?'txt-btn-disable':'']" @click="onConfirm">{{confirmText?confirmText:'确定'}}</div>
                </div>
                <slot v-else name="footer"></slot>
            </div>
        </div>
    </div>    
  </div>

</template>
<script>
export default {
    props: {
        loading:{type: Boolean,default:false},
        show:{type: Boolean,default:false},
        showClose: {type: Boolean,default: true},
        zIndex: {type: Number,default: 100},
        required:{type: Boolean,default:false},
        width:{type: Number,default:0},
        height:{type: Number,default:0},
        title:{type: String,default:''},
        tips:{type: String,default:''},
        hideFooter:{type: Boolean,default:false},
        // 如果显示默认的footer按钮则自定义的slot不生效
        showDefaultFooterContent:{type: Boolean,default:false},
        enableSave:{type: Boolean,default: true},
        autoClose:{type: Boolean,default: true},
        confirmText:{type: String,default:null},
    },
    methods: {
        onClose(){
            this.$emit('close')
            if(this.autoClose){
                this.$emit('update:show',false)
            }
        },
        onCancel() {
            this.$emit('cancel')
        },
        onConfirm() {
            this.$emit('confirm')
        }
    }
}
</script>
<style lang="scss" scoped>
.mu-mask{
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  z-index: 2999;
  background-color: var(--c_black_mask);
  transition: all .3s ease-in-out;
}
.mu-dialog{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0; 
    display: flex;
    align-items: center;
    justify-content: center;   
    &-cont{
        // position: absolute;
        // left: 50%;
        // top: 50%;
        // transform: translate(-50%,-50%);
        min-height: 100px;
        min-width: 200px;
        background-color: var(--c_white);

        display: flex;
        flex-direction: column;
        color: var(--c_black);
        letter-spacing: normal;
        font-style: normal;
        font-stretch: normal;
        font-size: 14px;
        .mu-dialog-header{
            position: relative;
            width: 100%;
            height: 64px;
            // background-color: var(--c_bg_sidebar);
            color: #fff;
            background: linear-gradient(rgb(5,96,177), rgb(6,86,171));
            display: flex;
            flex-direction: column;
            // align-items: center;
            justify-content: center;
            padding: 12px 16px;
            box-sizing: border-box;
            .mu-dialog-title{
                width: 100%;
                font-size: 20px;
                font-weight: bold; 
                display: flex;
                justify-content: space-between;
                align-items: center;
                &-require{
                    color:var(--c_status_red);
                    font-size: 14px;
                    font-weight: 400;
                    margin-top: 3px;
                }          
            }
        }
        .mu-dialog-content{
            flex: 1;
            width: 100%;
            /deep/ .form-body form{
                padding: 10px 20px;
                min-height: 300px;
                .el-form-item{         
                    color: var(--c_black);
                    .el-radio__input.is-checked .el-radio__inner{
                        border-color: var(--c_blue);;
                        background: var(--c_blue);;
                    }
                    .el-radio{
                        font-weight: 400;
                        font-size: 16px;
                        line-height: 21px;
                        color: var(--c_black);; 
                        margin-left: 20px;               
                    }
                    .el-radio__label{
                        font-size: 16px;  
                    }
                    .el-radio__input.is-checked+.el-radio__label{
                        color: var(--c_blue);;
                    }
                    .el-radio__inner{
                        border: 2px solid var(--c_black);;
                        font-size: 15px;
                    }
                    .el-form-item__label::before{
                        color: #E47979;
                    }
                    .el-form-item__label{
                        color: var(--c_gray_dark);
                        font-size: 14px;
                        font-weight: 700;
                    }
                    .el-input__inner,.el-textarea__inner{
                        border: 1px solid var(--c_gray);
                        // background-color: var(--c_white_dark);
                        font-size: 16px;
                        font-weight: 400;
                        &::placeholder{
                           color: var(--c_ele_gray_dark);
                        }
                    }
                    .el-textarea__inner::-webkit-scrollbar {
                        width: 12px;
                        background-color: var(--c_white);
                    }
                    .el-textarea__inner::-webkit-scrollbar-thumb {
                        border-radius: 10px;
                        background-color: rgba(50, 50, 51, 0.4);
                    }
                    .el-select{
                        .el-icon-arrow-up:before {
                            color: var(--c_black);;
                            content: "\e78f";
                        }
                        .el-icon-arrow-up.is-reverse:before {
                            color: var(--c_black);;
                            content: "\e790";
                        }                
                    }
                    .el-tag{
                        font-size: 14px;
                        &--mini{
                            line-height: 16px;
                            padding: 0 7px 0 5px;
                        }
                    }
                }
                .el-form-item.is-error {
                    .el-input__inner {
                        border: 1px solid var(--c_status_red) !important;
                    }
                }
                .el-form-item.is-error.is-required{
                    .el-input__inner{
                        border: 1px solid var(--c_status_red) !important;
                    } 
                }
                .num-text.el-input-number .el-input__inner{
                    text-align: left !important;
                }
                .disable-block{
                    .el-form-item .el-form-item__label{
                        color: var(--c_gray);
                    }
                }                 
            } 
            /deep/ .el-switch.is-checked .el-switch__core   {
                border-color: var(--c_blue);;
                background-color: var(--c_blue);;

            }  
            /deep/ .el-tag--plain{
                color: var(--c_blue);
            }
            /deep/ .el-table__header-wrapper{
                background-color: var(--c_gray_highlight_text);
                border-bottom: 2px solid var(--c_blue_dark);
                tr{
                    height: 34px !important;
                }
                th{
                    font-weight: bold;
                    font-size: 14px;
                    line-height: 19px;
                    color: var(--c_black);
                    background-color: var(--c_gray_highlight_text);
                }
            }
            /deep/ .el-table__body-wrapper::-webkit-scrollbar {
                width: 12px;
                background-color: var(--c_white);
            }
            /deep/ .el-table__body-wrapper::-webkit-scrollbar-thumb {
                border-radius: 10px;
                background-color: rgba(50, 50, 51, 0.4);
            }
            /deep/ .el-table{
                color: var(--c_black);
                font-size: 14px;
                tr{
                    height: 48px;
                    td{
                        border-bottom: 1px solid var(--c_gray);
                    }
                }
                .el-table__body tr.current-row>td.el-table__cell{
                    background-color: var(--c_bg_blue);
                }
                .el-table__cell {
                    padding: 0px;
                    .cell {
                        box-sizing: border-box;
                        padding: 0px 8px;
                    }
                    .el-input__inner{
                        height: 28px;
                        border: 1px solid var(--c_gray);
                        // border: none;
                        // background-color: var(--c_white_dark);
                        font-size: 14px;
                        font-weight: 400;
                        &::placeholder{
                           color: var(--c_ele_gray_dark);
                        }
                    }
                    .el-input.is-disabled .el-input__inner {
                        cursor: default;
                    }
                    .el-form-item.is-error .el-input__inner, .el-form-item.is-error .el-input__inner:focus, .el-form-item.is-error .el-textarea__inner, .el-form-item.is-error .el-textarea__inner:focus, .el-message-box__input input.invalid, .el-message-box__input input.invalid:focus {
                        border-color: var(--c_status_red);
                    }                    
                }
                .el-checkbox__input.is-checked .el-checkbox__inner, .el-checkbox__input.is-indeterminate .el-checkbox__inner {
                    background-color: var(--c_blue);
                    border-color: var(--c_blue);
                }
                .el-checkbox__inner{
                    border: 2px solid var(--c_black);
                    border-radius: 0;
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
                    top: 4px;
                }
                .el-checkbox__inner::after{
                    box-sizing: content-box;
                    content: "";
                    border: 2px solid #FFF;
                    border-left: 0;
                    border-top: 0;
                    height: 7px;
                    left: 3px;
                    position: absolute;
                    top: 0px;
                    width: 3px;
                    transform-origin: center;
                }                      
            }
        }
        .mu-dialog-footer{
            box-sizing: border-box;
            width: 100%;
            height: 44px;
            border-top: 1px solid rgb(200, 200, 200);
            padding:0 15px;
            display: flex;
            align-items: center;
            // flex-direction: row-reverse;
            justify-content: flex-end;
            .txt-btn{
                // color: var(--c_blue);
                color: rgb(6,86,171);
                height: 100%;
                cursor: pointer;
                font-size: 18px;
                font-weight: 700; 
                display: flex;
                align-items: center; 
                padding: 0 20px;                              
                &:hover{
                    background-color: var(--c_gray);
                }
                &-cancel{
                    color: var(--c_gray_dark);
                }
                &-disable{
                    pointer-events: none;
                    color: var(--c_gray);
                }
            }
        }        
        .mu-dialog-btn-close{
            width: 24px;
            height: 24px;
            content: url('~@/assets/icons/dialog_close_normal.svg');
            cursor: pointer;
        }
        .mu-dialog-btn-close:hover{
            content: url('~@/assets/icons/dialog_close_hover.svg');
        }
        .mu-dialog-btn-close:active{
            content: url('~@/assets/icons/dialog_close_active.svg');
        }
    }
}
</style>
