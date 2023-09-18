function(instance, properties, context) {


  //Load any data 
    if (instance.data.mediaRecorder && (instance.data.mediaRecorder.getMediaRecorderState() != "inactive")) {
        instance.data.errorMsg("Impossible to change audio device while recording");
	} else {
        instance.data.changeMediaStream(instance.data.selectedVideoDeviceName, properties.audio_device_name);
    }

  //Do the operation



}