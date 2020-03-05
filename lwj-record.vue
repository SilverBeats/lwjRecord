<template>
	<view v-if="exist">
		<view class="mask" @tap="closeRecord"></view>
		<view class="record_box">
			<!-- 录音具体内容显示区域 -->
			<view class="tool_box">
				<!-- 展示当前时间包括：已经录音的时长和展示当前播放录音的时长 -->
				<view class="showTime">
					<view class="showTime_content">
						<!-- 展示当前录音的时长或者是当前播放录音倒计时 -->
						{{showRecordTime}}
					</view>
				</view>
				<!-- button按钮list -->
				<swiper class="button_list" :indicator-dots="true" @change="changeBtnPage">
					<!-- 滑块1：展示录音相关的按钮 -->
					<swiper-item 
						class="button_box_one" 
						style="display: flex;flex-direction: column;justify-content: space-around;" 
					>
						<button type="primary" plain="true" @tap="startRecord()" v-if="flag == 1">开始录音</button>
						<button type="primary" plain="true" @tap="pauseRecord()" v-else-if="flag==2">暂停录音</button>
						<button type="primary" plain="true" @tap="resumeRecord()" v-else>继续录音</button>
						<button type="primary" plain="true" @tap="stopRecord()">停止录音</button>
					</swiper-item>
					<!-- 滑块2：展示播放录音相关按钮，当用户正在录音时不能滑动到这个滑块 -->
					<swiper-item 
						class="button_box_two" 
						style="display: flex;flex-direction: column;justify-content:space-around;" 
					>
						<button type="primary" plain="true" @tap="playRecord()">播放录音</button>
						<button type="primary" plain="true" @tap="pausePlay()">暂停播放</button>
						<button type="primary" plain="true" @tap="stopPlay()">停止播放</button>
					</swiper-item>
				</swiper>
			</view>
			<!-- 录音文件展示列表 -->
			<view class="record_contentBox">
				<view class="record_list_title">当前录音列表</view>
				<checkbox-group @change="click">
					<scroll-view scroll-y="true" style="height: 370upx;">
						<view class="record_list_contentBox" v-for="(item,index) in recordPathList" :key="item.name">
							<span class="record_list_contentTitle">{{index + 1}} : {{item.name}}</span>
							<!-- 这里的disabled属性用于滑块2，通过控制复选框的disabled属性来实现单选框的功能效果 -->
							<!-- 当目前处于播放按钮界面，并且此时的复选框的value值不为null，而且不等于选中的那个时，应该禁用，为true -->
							<!-- :disabled="whichPage==1 && item.name != playItem && playItem != null"  -->
							<checkbox :value="item.name" class="record_list_checkbox" />
						</view>
					</scroll-view>
				</checkbox-group>
				<button class="delete_record" type="warn" v-if="hasRecord" @tap="deleteRecord">删除</button>
			</view>
		</view>
		<!-- 弹出框 -->
		<prompt :visible="promptVisible" :placeholder="popupPlaceholder" @confirm="clickPromptConfirm" @cancel="clickPromptCancel"
		 mainColor="#e74a39" :title="popupTitle">
		</prompt>
	</view>
</template>

<script>
	import lwjFun from "./js/lwj-record.js"
	import Prompt from "@/components/zz-prompt/index.vue"
	// 获取全局唯一的录音管理器 recorderManager
	const recorderManager = uni.getRecorderManager();
	// 创建并返回内部 audio 上下文 innerAudioContext 对象
	const innerAudioContext = uni.createInnerAudioContext();

	export default {
		name: "lwj-record",
		props: {
			recordTime: { // 录音的最长时间，单位毫秒
				type: Number,
				default: 600 // 默认最长10分钟，600s = 10min
			},
			popupPlaceholder: {
				type: String,
				default: "请主人赐名"
			},
			popupTitle: {
				type: String,
				default: "给这条录音起个名字吧"
			},
			recordPathList : {
				type: Array,
				default: function() {
					return []
				}
			}
		},
		watch: {
			// 监听录音文件路径数组的值变化
			recordPathList() {
				// 倘若没有录音，那么就不会显示删除录音按钮
				this.recordPathList.length != 0 ? this.hasRecord = true : this.hasRecord = false;
			},
			// 监听whichPage
			whichPage() {
				this.whichPage == 1 ? this.hasRecord = false:this.hasRecord = true;
			},
			// 监听name值的变化
			name(newVal) {
				// 用户要是命名了，说明用户要保存这条数据，会执行之后的代码内容
				if (this.name != "") {
					// 如果命名重复
					if (lwjFun.isRepeat(newVal, this.recordPathList)) {
						lwjFun.showToast("请不要起同样的名字哦~~", "bottom");
					} else {
						lwjFun.showToast("保存成功", "bottom");
						// 如果命名没有重复，向recordPathList中加入一条记录
						this.recordPathList.push({
							voicePath: this.voicePath, // 录音文件路径
							time: this.time, // 录音时长
							name: this.name // 用户自定义命名的文件名
						});
						// name值置空
						this.name = "";
						// voicePath置空
						this.voicePath = ";"
						// 点击停止并重命名后，记录的录音时间归零
						this.time = 0;
						// 让弹出框消失
						this.promptVisible = false;
						// 点击停止录音并且重命名后，将按钮变成开始录音
						this.flag = 1;
					}
				};
			}
		},
		mounted() {
			// 当recordPathList的内容是传进去的话，watch无法监听到，
			// 需要在mounted这里监听，不然会光有录音列表，而没有删除按钮
			if(this.recordPathList.length != 0)this.hasRecord = true;
		},
		data() {
			return {
				// 点击mask区域后，此组件会自动消失
				exist: true,
				// 点否点击了暂停录音按钮，按钮的状态位：1代表开始录音，2代表暂停录音，3代表继续录音
				flag: 1,
				// recordPathList若有数据则为true，用来判断是否展示删除按钮的标志位
				hasRecord: false,
				// 录音路径，存储的是tempFilePath
				voicePath: "",
				// 1. 当前已经录制的时间，单位秒，经过computed计算后，会动态展示
				// 2. 当前正在播放的录音时长，单位秒，经过computed计算后，会呈现出倒计时的效果
				time: 0,
				// 复选框选中的列表，里面存储的是recordPathList数组中每个对象的name值，供删除
				chooseList: [],
				// 记录需要播放的录音name值，name值用户定义
				playItem: null,
				// 控制弹框输入框显示
				promptVisible: false,
				// 用来存储用户所写的文件名，与弹出框结合使用
				name: "",
				// 当前音频播放的位置
				currentTime: 0,
				// 记录当前是录音按钮界面还是播放录音按钮界面,0为录音界面，1为播放录音按钮界面
				whichPage: 0,
			}
		},
		components: {
			Prompt
		},
		computed: {
			// 动态计算已经录制的时间或者播放的录音的剩余时间
			showRecordTime() {
				return lwjFun.formatTime(this.time);
			}
		},
		methods: {
			// 关闭组件
			closeRecord() {
				// 当此时按钮为开始录音按钮时，说明没有录音，点击mask区域可以关闭此组件
				// 当正在播放录音时，点击mask区域不会令组件关闭,time==0说明没有录音正在播放
				if(this.flag == 1 && this.time == 0) {
					// 此组件消失
					this.exist = false;
					// 组件消失的时候发送closeRecord事件，将存储的recordPathList传出去
					this.$emit("closeRecord", this.recordPathList)
				}
			},
			// 开始录音事件
			startRecord() {
				let _this = this;
				// 开始录音
				recorderManager.start({
					duration: this.recordTime*1000 // 设置录制音频时长，里面传的值是ms，所以要乘1000
				});
				if (this.timeObj == null) {
					// 开始录音后，设定计时器，用以记录录音的时间
					this.timeObj = setInterval(function() {
						_this.time++;
					}, 1000);
					// 点击开始录音按钮后，开始录音应该变成暂停录音
					this.flag = 2;
				}
			},
			// 暂停录音事件
			pauseRecord() {
				// 暂停录音
				recorderManager.pause();
				// 记录录音时长也暂停
				clearInterval(this.timeObj);
				// 计时器置空
				this.timeObj = null;
				// 点击暂停录音后，录音暂停，并且将按钮变成继续录音
				this.flag = 3;
			},
			// 继续录音事件
			resumeRecord() {
				let _this = this;
				// 继续录音
				recorderManager.resume();
				if (this.timeObj == null) {
					// 设置定时器用来记录录音时间
					this.timeObj = setInterval(function() {
						_this.time++;
					}, 1000);
					// 点击继续录音后，按钮变成暂停录音
					this.flag = 2;
				}
			},
			// 停止录音事件
			stopRecord() {
				// 只有当前flag为2或3时，即暂停录音或继续录音，结束录音事件才能被触发
				if (this.flag == 1) return;
				let _this = this;
				// 停止录音
				recorderManager.stop();
				// 监听录音结束事件，获取录音文件的临时路径
				recorderManager.onStop(function(res) {
					// 用于记录录音时间的计数器停止
					clearInterval(_this.timeObj);
					// 计时器置空
					_this.timeObj = null;
					// 向voicePath添加路径
					_this.voicePath = res.tempFilePath;
					// 显示弹出框，之后用户命名后，会触发用于记录命名的name值的变化
					_this.promptVisible = true;
				});
			},
			// 点击复选框的事件方法
			click(e) {
				// chooseList数组中存储的是选中项的value值
				this.chooseList = e.detail.value;
			},
			// 切换滑块的时候，记录当前滑块的current值，判断是哪个滑块
			changeBtnPage(e) {
				let canMove = (this.whichPage == 0 && this.flag == 1) || (this.whichPage == 1 && this.time == 0);
				// 如果不满足条件说明，要么是录音的时候移动，要么就是播放录音的时候移动，需要结束当前的录音或是播放录音，才能移动
				if(!canMove) {
					// 当是录音期间，滑动滑块时
					if(this.whichPage == 0) {
						this.stopRecord();
					} 
					// 当是播放录音期间，滑动滑块时
					if(this.whichPage == 1) {
						this.stopPlay();
					}
				}
				// 记录当前滑块的值
				this.whichPage = e.detail.current;
				console.log(this.chooseList)
			},
			// 删除记录
			deleteRecord() {
				// chooseList中涵盖的，recordPathList数组都会剔除，删除录音列表，以及对应文件
				this.recordPathList = lwjFun.deleteListMethods(this.recordPathList, this.chooseList);
				// 进行删除操作后，选中列表清空
				this.chooseList = [];
				// 告知用户删除结果
				lwjFun.showToast("删除成功", "bottom");
			},
			// 弹出框点击确认的事件，将用户的输入弹出框的名字保存
			clickPromptConfirm(val) {
				// 记录用户定义录音文件的name名字
				this.name = val;
			},
			// 弹出框点击取消事件，隐藏弹出框，并且取消保存这条录音已经记录
			clickPromptCancel() {
				// 隐藏弹出框
				this.promptVisible = false;
				//因为此时name值为空，所以点击取消时，不需要再name=""，116行，每次保存成功都会令name=""
				// 删除这条录音文件
				lwjFun.deleteOneFile(this.voicePath);
				this.voicePath = "";
				// 将显示用的时间清零
				this.time = 0;
				// 将按钮变为开始录音按钮
				this.flag = 1;
			},
			// 播放录音事件
			playRecord() {
				let _this = this;
				innerAudioContext.autoplay = true;
				// currentTime为0说明当前处于从头播放录音的状态，需要设置音频的路径
				if (this.currentTime == 0) {
					if(this.chooseList.length != 1) {
						lwjFun.showToast("有多个选中项，只播放最上面一条","bottom");
					}
					// 倘若在播放界面有多个选中项，只播放第一条音频
					this.playItem = this.chooseList[0];
					// 得到name值为playItem对应的文件路径
					let playPath = lwjFun.findRecordPath(this.playItem,this.recordPathList);
					console.log(playPath)
					// 设置音频文件路径
					if(playPath != null) {
						// 设置音频播放的路径
						innerAudioContext.src = playPath;
					} else {
						lwjFun.showToast("当前播放路径无效","bottom");
						// 路径无效时，将此时的音频设置为undefined
						innerAudioContext.src = undefined;
						return;
					}
				} else {
					// currentTime！=0说明有当前有音频还未结束播放
					// 设置音频播放跳转的位置，currentTime会在监听暂停事件中进行赋值设置
					innerAudioContext.seek = this.currentTime;
				}
				innerAudioContext.play();
				innerAudioContext.onPlay(function() {
					// 即currentTime为0时，说明当前需要将音频从头播放，获取音频总时长
					if (_this.currentTime == 0) {
						// 设置当前音频总时长
						innerAudioContext.duration;
						setTimeout(function() {
							// 获取当前音频总时长，四舍五入
							_this.time = Math.round(innerAudioContext.duration);
						}, 50);
					}
					if (_this.playTimeClock == null) {
						// 创建名字为playTimeClock的定时器，用于做倒计时
						_this.playTimeClock = setInterval(function() {
							_this.time--;
						}, 1000);
					}
				});
				// 监听自然播放结束
				innerAudioContext.onEnded(function() {
					// 清除倒计时
					clearInterval(_this.playTimeClock);
					// 计时器置空
					_this.playTimeClock = null;
					// 当自然播放结束后，将显示倒计时的时间置空
					_this.time = 0;
					// 即便在播放过程中出现过几次暂停，只要不是通过stop结束的音频，都属于自然播放
					_this.currentTime = 0;
					// 录音播放停止后，将此时的音频播放路径指向一个无效地址
					innerAudioContext.src = undefined;
				});
			},
			// 暂停录音事件
			pausePlay() {
				if(this.chooseList.length == 0){
					lwjFun.showToast("无效操作", "bottom");
					return;
				}
				let _this = this;
				innerAudioContext.pause()
				// 监听暂停播放事件
				innerAudioContext.onPause(function() {
					// 记录当前播放的位置，用于继续播放的能够直接定位到之前的位置
					_this.currentTime = Math.round(innerAudioContext.currentTime);
					// 清除倒计时
					clearInterval(_this.playTimeClock);
					// 将计时器设置为空
					_this.playTimeClock = null;
				});
			},
			// 停止播放录音
			stopPlay() {
				if(this.chooseList.length == 0){
					lwjFun.showToast("无效操作", "bottom");
					return;
				}
				innerAudioContext.stop();
				// 清除倒计时
				clearInterval(this.playTimeClock);
				// 计时器置空
				this.playTimeClock = null;
				// 当点击停止播放后，将显示倒计时的时间置空
				this.time = 0;
				// 停止后，当前播放位置应该是0
				this.currentTime = 0;
				// 录音播放停止后，将此时的音频播放路径设置为undefined
				innerAudioContext.src = undefined;
			}
		}
	}
</script>

<style scoped>
	@import url("./css/lwj-record.css");
</style>