<template>
  <button type="button" :class="classStr" @click="click" :style="{borderRadius:borderRadius}">
      <span>
          <slot></slot>
      </span>
      <div v-if="loading" class="loading-mask">
          <i class="el-icon-loading"></i>
      </div>
  </button>
</template>
<script>
export default {
  props: {
      type:{type:String,default: 'default'},
      plain:{type:Boolean,default: false},
      size:{type: String,default: 'medium'},
      circle:{type: Boolean,default: false},
      active:{type: Boolean,default: false},
      disable:{type: Boolean,default: false},
      icon:{type:String,default:null},
      bubble:{type:Boolean,default:false},
      loading:{type:Boolean,default:false},
      disableTips:{type:String,default:''},
      borderRadius:{type:String,default:'4px'}
  },
  data() {
      return {
          property: 'value'
      }
  },
  computed: {
      classStr() {
          var arr = ['c-button']
          arr.push('c-button-'+this.type)
          arr.push('c-button-'+this.size)
          if(this.active){
              arr.push(`c-button-${this.type}-active`)
          }  
          if(this.plain){
              arr.push(`c-button-${this.type}-plain`)
          } 
          if(this.disable){
              arr.push(`c-button-disable`)
          }                      
          return arr;
      },
  
  },
  methods: {
      click(e) {
          if(this.disable){
              if(this.disableTips){
                  this.$message(this.disableTips);
              }
              return
          }
          this.$emit('click');
          if(!this.bubble){
              if(window.event){
                  window.event.cancelBubble = true
                  e.preventDefault()
              }else{
                  e.preventDefault()
              }
          }
      },
  },
}
</script>
<style lang="scss" scoped>
.c-button{
  $white:var(--c_white);
  $blue:var(--c_blue);
  $blue_dark:var(--c_blue_dark);
  $bg_blue:var(--c_blue_btn_bg);
  $coral:var(--c_red);
  $orange:var(--c_pumpkin_orange);
  $bg_orange:var(--c_bg_orange_btn);
  $gray:var(--c_gray);
  $gray_border:var(--c_gray_border);
  $black:var(--c_black);
  $red_dark:var(--c_red_dark);

  display: inline-block;
  font-size: 14px;
  transition: .1s;    
  line-height: 1;
  cursor: pointer;
  border: 1px solid $gray_border;
  background: $white;
  color: $black;
  text-align: center;
  box-sizing: border-box;
  margin: 0;
  font-weight: 500;
  // padding:12px 10px;
  padding: 9px 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline:none; 
  position: relative;
  box-sizing: border-box;
  font-family: Microsoft JhengHei;
  &>span{
      line-height: 20px;
      // height: 100%;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  .loading-mask{
      position: absolute;
      top:0;
      left:0;
      width: 100%;
      height: 100%;
      background-color: var(--c_btn_mask);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
  }
  &-primary{
      border:1px solid $blue;
      color: $blue;
      background: $white;
      &:hover{
          box-shadow: 0 0 5px 2px rgba(42, 174, 245,0.2);
      }
      &-plain{
          background: $bg_blue;
      }
      &-active{
          color: $white;
          background: $blue;
          box-shadow:none;
          .loading-mask{
              color: $blue;
          }
          &.c-button-disable{
              color: #FFFFFF;
              background: #C8C8C8; 
              &:hover{
                  box-shadow: none;
              }                 
          }
      }
  }
  &-success{
      border:1px solid $blue;
      color: $blue;
      background: $white;
  }
  &-info{
    border:1px solid $black;
    color: $black;
    background: $white;
    &:hover{
        box-shadow: 0 0 5px 2px rgba(42, 174, 245,0.2);
        border:1px solid $blue;
        color: $blue;
        // background: rgba(42, 174, 245,0.2);
    }
    &.c-button-disable{
        &:hover{
            box-shadow: none;
            border:1px solid $gray;
            color: $gray;
        }                 
    }
  }
  &-warning{
      border:1px solid $orange;
      color: $orange;
      background: $white;
      &-plain{
          background: $bg_orange;
      } 
      // &:hover{
      //     color: $white;
      //     background: $orange;
      //     box-shadow:none;
      // }                 
  }    
  &-danger{
      border:1px solid $red_dark;
      color: $red_dark;
      background: $white;
  }
  &-cancel{
      border:1px solid var(--c_gray_dark);
      color: $white;
      background: var(--c_gray_dark);
  }       
  &-medium{
      font-size: 14px;
  }
  &-small{
      font-size: 12px;
      padding: 9px 15px;
  }    
  &-mini{
      font-size: 12px;
      padding: 2px 10px;          
  }
  &-disable{
      border:1px solid $gray;
      color: $gray;
      cursor:not-allowed;
      // color: #FFFFFF;
      // background: #C8C8C8;
  }
  &-green{
      border:1px solid #06A090;
      color: #06A090;
      background: $white;
      &:hover{
          box-shadow: 0 0 5px 2px rgba(6, 160, 144,0.2);
      } 
      // &-plain{
      //     background: $bg_blue;
      // }     
      &-active{
          color: $white;
          background: #06A090;
          box-shadow:none;
          .loading-mask{
              color: #06A090;
          }
      }
  }
}
  // .c-is-plain{

  // } 
  // .c-is-circle{

  // }
</style>