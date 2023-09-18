function(instance, context) {

    // Setup the visual elements

    // Create ID for the plugin element

    id = 'video_' + Math.random().toString(36).substr(2, 9);

    instance.canvas.attr('id', id);

    // Create the video element and insert into plugin element
    //video element Id
    videoElementId = id+"_vid";
    instance.data.videoElement = document.createElement('video');
    instance.data.videoElement.id = videoElementId;
    instance.data.videoElement.autoplay = true;
    instance.data.videoElement.muted = true;
    instance.data.videoElement.style.width = "100%"
    instance.data.videoElement.style.height = "100%"

    instance.data.recordedChunks = [];

    instance.canvas.append(instance.data.videoElement);
    
    /*********************************************
        Function to trigger an error message
    *********************************************/
    instance.data.errorMsg = function (errorMessage) {
        instance.publishState("error_message", errorMessage);
        instance.triggerEvent("error");
    }

    /*********************************************
        Function to create the MediaRecorder
    *********************************************/
    instance.data.createMediaRecorder = function () {

        /*
        	At First, We need to generate the Delegated Upload Token accorcing to this : https://api.video/blog/tutorials/delegated-uploads/
            it is done in 2 steps :
            1. generate a token from API Key
            2. generate an Upload Token (delegated upload token) from that token
            
        */

        const myBody = {apiKey:context.keys["api.video API Key"]};
        
        const myTokenOptions = {
            method : "POST",
            header: {
                accept:"application/json",
                "content-type":"application/json"
            },
            body: JSON.stringify(myBody)
        };
        const myDelegatedTokenOptions = {
            method : "POST",
            headers: {
				"Content-type": "application/json"
            }
        };

        fetch("https://eokfgxvbtgvt7w7.m.pipedream.net", myDelegatedTokenOptions)
            .then(response => {
            response.json()
                .then (data => {
                /*
					Data looks like :
                    {
                    	"token": "to1psZlyp1yvaz4OIGaWYRyi",
                        "ttl": 0,
                        "createdAt": "2023-09-15T09:55:08+00:00",
                        "expiresAt": null
                    }                            
                */
                instance.data.uploadToken = data.token;

                // Now we can create the mediaRecorder
                const mediaRecorder = new ApiVideoMediaRecorder(instance.data.mediaStream, {
                    uploadToken: data.token,
                    retries: 10,
                });    

                instance.data.mediaRecorder = mediaRecorder;


/*                instance.data.mediaRecorder.addEventListener('videoPlayable', function(event) {

                    console.log("videoPlayable: ", event);
                    const lVideo = event.data;
                    instance.data.videoId = lVideo.videoId;
                    instance.data.videoUrl = lVideo.assets.mp4;
                    instance.publishState("uploaded_file",instance.data.videoUrl);
                    instance.publishState("video_id",instance.data.videoId);
                    instance.triggerEvent("replay_ready");
                    
                }); */

                instance.data.mediaRecorder.addEventListener('recordingStopped', function(event) {
                    // Handle the 'stop' event as needed
                    instance.data.setState(instance.data.mediaRecorder.getMediaRecorderState());
                    instance.triggerEvent("recording_ended");

                });

                instance.data.mediaRecorder.addEventListener('error', function(event) {

                    instance.pusblishState("error_message",event.data);
                    instance.triggerEvent("error");

                });
                

            })
        })
		.catch(error => {
            console.error("Impossible to get upload Token: ",error);
        });
                
    }
    
    /****************************x**************************
        Function to get the MediaStream of selected Devices
    ******************************************************/
    instance.data.changeMediaStream = function ( selectedVideoDeviceName, selectedAudioDeviceName) {
        
        const videoDevice = instance.data.videoDevices.find(device => device.label === selectedVideoDeviceName);
        const audioDevice = instance.data.audioDevices.find(device => device.label === selectedAudioDeviceName);

        if (!videoDevice || !audioDevice) {
            instance.data.errorMsg('Selected video or audio device not found.');
            return;
        }

        if (instance.data.selectedVideoDeviceName != selectedVideoDeviceName) {
            instance.data.selectedVideoDeviceName = selectedVideoDeviceName;
            instance.publishState("selected_video_device", instance.data.selectedVideoDeviceName);
            instance.triggerEvent("new_selected_video_device");
        }

        if (instance.data.selectedAudioDeviceName != selectedAudioDeviceName) {
            instance.data.selectedAudioDeviceName = selectedAudioDeviceName;
            instance.publishState("selected_audio_device", instance.data.selectedAudioDeviceName);
            instance.triggerEvent("new_selected_audio_device");
        }        

        const constraints = {
            video: { deviceId: { exact: videoDevice.deviceId } },
            audio: { deviceId: { exact: audioDevice.deviceId } }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
            instance.data.mediaStream = stream;
            // Change video element source
            instance.data.videoElement.srcObject = stream;

            //let newVideoTrack = stream.getVideoTracks()[0];
            // let newAudioTrack = stream.getAudioTracks()[0];
			// let lTracks = instance.data.mediaRecorder.stream.getTracks();
            
            // we have to recreate a new API Video Media Recorder
			instance.data.createMediaRecorder();
            
        })
            .catch((error) => {
            console.error('Error changing media stream:', error);
        });
    }
    
    /******************************
        Function to get User Media Permission & Stream
    ******************************/
    instance.data.getUserMediaPermissions = function () {

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        	.then(function(stream) {
                // User media permission granted
                // console.log("User media permission granted");
                // Do something with the stream

				// First we enumerate the Devices
            	// and an array with the Device Names
            	navigator.mediaDevices.enumerateDevices()
                    .then(devices => {

                        // Create arrays of audio & video devices 
                        const videoDevices = devices.filter(device => device.kind === 'videoinput');
                        const audioDevices = devices.filter(device => device.kind === 'audioinput');

                    	const defaultVideoDevice = videoDevices[0];
                    	const defaultAudioDevice = audioDevices[0];
                    
                        instance.data.videoDevices = videoDevices;
                        instance.data.audioDevices = audioDevices;
                    
                        instance.data.defaultVideoDevices = defaultVideoDevice;
                        instance.data.defaultAudioDevices = defaultAudioDevice;
                    
                        // Create arrays of audio & video device Names 
                        const videoDeviceNames = videoDevices.map(device => device.label);
                        const audioDeviceNames = audioDevices.map(device => device.label);

                        instance.data.videoDeviceNames = videoDeviceNames;
                        instance.data.audioDeviceNames = audioDeviceNames;
                    
                    	instance.publishState("video_devices",instance.data.videoDeviceNames);
                    	instance.publishState("audio_devices",instance.data.audioDeviceNames);
                    	instance.triggerEvent("media_devices_changed");
                    
                    	instance.data.changeMediaStream(defaultVideoDevice.label, defaultAudioDevice.label);

                        /*
                            instance.publishState("selected_video_device", );
                            instance.triggerEvent("new_selected_video_device");

                            instance.publishState("selected_audio_device", instance.data.selectedAudioDeviceName);
                            instance.triggerEvent("new_selected_audio_device");

						*/
                    

                	})
                    .catch(error => instance.data.errorMsg(error.name + ": "+error.message));
            
            	// Then, with the media stream, we create the MediaRecorder
            
            
            	// instance.data.createMediaRecorder();
                        
            })
            .catch(function(error) {
              // Handle specific error types
              if (error.name === "NotAllowedError") {
                // User denied permission
                // Display custom message to the user
                instance.data.errorMsg("Permission denied. Please grant access to your camera and microphone.");
                // Additional actions if needed
              } else if (error.name === "NotFoundError") {
                // No media devices found
                // Display custom message to the user
                instance.data.errorMsg("No camera or microphone found. Please ensure that your device has the required hardware.");
                // Additional actions if needed
              } else if (error.name === "OverconstrainedError") {
                // Unsupported media configuration
                // Display custom message to the user
                instance.data.errorMsg("Unsupported media configuration. Please try again with different camera or microphone settings.");
                // Additional actions if needed
              } else {
                // Other types of errors
                // Display custom message to the user or perform general error handling
                instance.data.errorMsg("An error occurred. Please try again later.");
                // Additional actions if needed
              }
            });
    }

    /*********************************************
        Oh ! We have to handle the fact that the devices list can change
        due to unplugging micro or webcam or a quantum change into cosmologic state of things 
    *********************************************/
    // Event handler for device changes
    function handleDeviceChange() {
        instance.data.getUserMediaPermissions();
        
        // Use the audioDevices and videoDevices arrays as needed
        instance.publishState("video_devices", instance.data.videoDeviceNames);
        instance.publishState("audio_devices", instance.data.audioDeviceNames);
        instance.triggerEvent("media_devices_changed");
    }

    // Add event listener for device change
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    
    /*********************************************
        Function to generate a datetime filename
    *********************************************/

    instance.data.generateFileName = function () {
        const dateTime = new Date(); // Current date and time

        const formatter = new Intl.DateTimeFormat('en', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        return formatter.format(dateTime);
    }
    
    /*********************************************
        Function to create a StreamReader from the recorded blob
    *********************************************/
    
    instance.data.createStreamFromBlob = function (blob) {
        
        //debugger;

        const reader = blob.stream().getReader();

        // Create a new ReadableStream
        const stream = new ReadableStream({
            start(controller) {
                function push() {
                    // Read the next chunk from the Blob
                    reader.read().then(({ done, value }) => {
                        if (done) {
                            // No more data available, close the stream
                            controller.close();
                            return;
                        }

                        // Push the chunk to the stream
                        controller.enqueue(value);
                        push();
                    });
                }

                push();
            }
        });

        return stream;
    }
    
    /*********************************************
        Function to generate a Base64 String based on the blob
    *********************************************/

    instance.data.createObjectURL = function (blob) {
        const objectURL = URL.createObjectURL(blob);
		instance.data.objectURL = objectURL;
        instance.publishState("object_url",instance.data.objectURL);
		instance.triggerEvent("replay_ready");

    }

	instance.data.createBase64URI = function (blob, callback) {
        const reader = new FileReader();
        reader.onloadend = function () {

            // debugger;

            const base64Data = reader.result;
            const dataURI = base64Data;
            callback(dataURI);
        };
        reader.readAsDataURL(blob);
    }

    /*********************************************
        Function to create a Blob based on record chunks
        it generates :
        - a Blob : instance.data.recordedBlob
        - a ReadableStream from the blob : instance.data.recordedBlobSteam
        - a base64 string from the Blob : instance.data.base64String & the published State 'Base64 Recording'
    *********************************************/    
    instance.data.createBlobRecording = function () {

        const recordedBlob = new Blob(instance.data.recordedChunks, { type: instance.data.mediaRecorder.mimeType });
        instance.data.recordedBlob = recordedBlob;
        
        
        const blobStream = instance.data.createStreamFromBlob(recordedBlob);
        instance.data.recordedBlobSteam = blobStream;
        
        instance.data.createObjectURL(recordedBlob);
        
    }
    
    /*********************************************
        Function to send the actual recording content to bubble
    *********************************************/    
    instance.data.sendToBubble = function (filename) {

		if (instance.data.recordedBlob) {
            
            instance.data.createBase64URI(instance.data.recordedBlob, function (uri) {

        		debugger;
                let base64String = uri;
                context.uploadContent(filename, base64String.split(';base64,')[1], (err,url) =>{

                    instance.data.bubbleFileURL = url;

                    instance.publishState("uploaded_file", instance.data.bubbleFileURL);
                    instance.triggerEvent("recording_uploaded");

                });

            });

        }
    }
    
    /*********************************************
        Function to download the Base64 string
    *********************************************/    
    instance.data.downloadBase64 = function (filename) {
        const link = document.createElement('a');
        link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(instance.data.base64String));
        link.setAttribute('download', filename);
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /*********************************************
        Function to download the recording
    *********************************************/
    instance.data.downloadRecord = function (filename) {

        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(instance.data.recordedBlob);
        downloadLink.download = filename; // Specify the desired filename with appropriate extension

        // Add the download link element to the DOM
        document.body.appendChild(downloadLink);

        // Programmatically trigger the download
        downloadLink.click();

        // Clean up
        URL.revokeObjectURL(downloadLink.href);
        document.body.removeChild(downloadLink);
    }    

    
    /*********************************************
        Function to set the plugin state
    *********************************************/
    instance.data.setState = function (state) {
        console.log("State: ",state);
        instance.publishState("state", state);
        instance.triggerEvent("state_changed");
        
    }
    
    /*********************************************
    Function to start recording stopwatch
    *********************************************/  
    
    // Pending
    
    
    /*********************************************
    Function to stop recording stopwatch
    *********************************************/    
    
    /******************************************************
        Let's initialize everything : 
        - get the Devices Names
        - Start a stream with default Devices
    ******************************************************/
    instance.data.setState("inactive");

    instance.data.getUserMediaPermissions();
    
    instance.data.startRecording = function () {
        
        instance.data.mediaRecorder.start();

        instance.data.setState(instance.data.mediaRecorder.getMediaRecorderState());
        // Handle the 'start' event as needed
        instance.triggerEvent("recording_started");
        
    }

    instance.data.stopRecording = function () {
        // First we start a MediaRecorder on the actual mediaStream
        instance.data.mediaRecorder.stop()
        .then (v => {
            console.log("Video: ", v);
            const lVideo = v;
            instance.data.videoId = lVideo.videoId;
            instance.data.videoUrl = lVideo.assets.mp4;
            instance.publishState("uploaded_file",instance.data.videoUrl);
            instance.publishState("video_id",instance.data.videoId);
            instance.triggerEvent("replay_ready");
        });
        
    }

    instance.data.pauseRecording = function () {
        // First we start a MediaRecorder on the actual mediaStream
        instance.data.mediaRecorder.pause();
        
    }

    instance.data.resumeRecording = function () {
        // First we start a MediaRecorder on the actual mediaStream
        instance.data.mediaRecorder.resume();
        
    }
    
    instance.data.isTypeSupported = function (mimeType) {
        const result = MediaRecorder.isTypeSupported(mimeType);
        instance.publishState("is_mimetype_supported", result);
        instance.triggerEvent("mimetype_checked");
    }
    
}
