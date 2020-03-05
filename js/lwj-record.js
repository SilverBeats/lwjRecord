let lwjFun = {
	formatTime,
	deleteOneFile,
	deleteListMethods,
	findRecordPath,
	showToast,
	isRepeat
}
export default lwjFun;
/**
 * @param {Object} time
 * 根据传入的录音的时间，返回分秒格式的字符串mm:ss
 */
function formatTime(time) {
	// 当time为0说明还未开始录音或者因为某些原因需要重新录制
	if (time == 0) return "00:00";
	// 得到当前已经录制了几分几秒
	let m = Math.floor(time / 60);
	let s = time % 60;
	if (m < 10) m = "0" + m;
	if (s < 10) s = "0" + s;
	return m + ":" + s
}
/**
 * @param {Object} path
 * 删除一个文件，path是文件路径
 */
function deleteOneFile(path) {
	uni.removeSavedFile({
		filePath: path,
		success: function(res) {
			console.log("success");
			console.log(res);
		},
		fail: function(err) {
			console.log("删除失败")
			console.log(err)
		}
	})
}

/**
 * @param {Object} originalList
 * @param {Object} chooseList
 * originalLis为原始数组，组件中是指recordPathList
 * chooseList为原始数组中需要删除的部分组成的数组，这里是指data中的chooseList，记录的是要从
 * recordPathList中要删除的name值
 * 这个方法用于删除recordPathList列表，以及删除对应的录音文件
 */
function deleteListMethods(originalList, chooseList) {
	let tempList = [];
	// oriIndex里面是originalList中每个数组元素的下标，这里的数组元素是对象
	for (let oriIndex in originalList) {
		// chooseIndex是chooseList中每个数组元素的下标，就是要删除的name
		for (let chooseIndex in chooseList) {
			// 如果删除列表中的name和originalList中的name相同，说明要删除
			if (originalList[oriIndex].name == chooseList[chooseIndex]) {
				// 删除文件
				deleteOneFile(originalList[oriIndex].voicePath)
			} else {
				// 这一步是保留，将保留的内容添加到临时数组中，再返回，实现recordPathList数组列表的更新
				tempList.push(originalList[oriIndex]);
			}
		}
	}
	return tempList;
}
/**
 * @param {Object} newName
 * @param {Object} arrayList
 * newName是用户输入的名字
 * arrayList是指这里的recordPathList
 * 函数功能：用于判断用户输入的名字是否之前已经输入过了
 * 因为26行的key绑定是recordPathList数组中存的每个对象的name值
 */
function isRepeat(newName, arrayList) {
	for (let index in arrayList) {
		if (arrayList[index].name == newName) {
			return true;
		}
	}
}
/**
 * @param {Object} name
 * 传过来的name是当前需要播放的录音的name
 * 通过name值从recordPathList中找到对应的下标
 * 要是没找到，则返回null
 */
function findRecordPath(name, recordPathList) {
	for (let i = 0, length = recordPathList.length; i < length; i++) {
		if (recordPathList[i].name == name) {
			return recordPathList[i].voicePath;
		} 
	}
	return null;
}
/**
 * @param {Object} title
 * @param {Object} position
 */
function showToast(title, position = "bottom") {
	uni.showToast({
		mask: true,
		title: title,
		position: position,
		duration: 2000
	})
}
