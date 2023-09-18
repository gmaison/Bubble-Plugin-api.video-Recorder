function(instance, properties, context) {


  //Load any data 

   	if (instance.data.mediaRecorder && (instance.data.mediaRecorder.getMediaRecorderState() != "inactive")) {
        instance.data.errorMsg("Impossible to change video device while recording");
	} else {
		instance.data.changeMediaStream(properties.video_device_name, instance.data.selectedAudioDeviceName);
    }

  //Do the operation



}