let outputs;
let fileInput;
let inputPreview;
window.onload = init;

function init(){
	outputs = document.getElementById("outputs");
	fileInput = document.getElementById("flag-input");
	fileInput.addEventListener("change", generateImages);
	inputPreview = document.getElementById("input-preview");
}

function chunkArray(array, chunkSize) {
	let chunked = [];
	for (let i = 0; i < array.length; i += chunkSize){
		chunked.push( array.slice(i, i + chunkSize) );
	}
	return chunked;
}

// https://gist.github.com/JordanDelcros/518396da1c13f75ee057
function addColors(rgba0, rgba1){
	let [r0, g0, b0, a0] = rgba0;
	let [r1, g1, b1, a1] = rgba1;

	// Normalize alpha
	a0 /= 255;
	a1 /= 255;

	let a = 1 - (1 - a1) * (1 - a0);

	let color = [
		(r1*a1 + r0*a0*(1 - a1)) / a,
		(g1*a1 + g0*a0*(1 - a1)) / a,
		(b1*a1 + b0*a0*(1 - a1)) / a,
		255
	];

	return color.map(v => Math.round(v));
}

function fileToB64(imgFile) {
	return new Promise((res, rej) => {

		let reader = new FileReader();
		reader.readAsDataURL(imgFile);
		
		reader.onload = function(){
			res(reader.result);
		};
		
		reader.onerror = function(){
			rej(reader.error);
		};

	});
}

function srcToArray(src){
	return new Promise((res, rej) => {

		let image = new Image();
		image.src = src;

		image.onload = function(){
			let canvas = document.createElement("canvas");
			canvas.width = image.width;
			canvas.height = image.height;
			
			let ctx = canvas.getContext("2d");
			ctx.drawImage(image, 0, 0);

			let array = Array.from(ctx.getImageData(0, 0, image.width, image.height).data);
			array = chunkArray(array, 4);
			array = chunkArray(array, image.width);
			
			res(array);
		}

		image.onerror = function(error){
			rej(error);
		}

	});
}

function arrayToSrc(array, size){
	return new Promise((res, rej) => {

		let imgData = new ImageData(new Uint8ClampedArray(array.flat(1)), size[0], size[1]);
		let canvas = document.createElement("canvas");
		canvas.width = size[0];
		canvas.height = size[1];
		
		let ctx = canvas.getContext("2d");
		ctx.putImageData(imgData, 0, 0);

		let b64 = canvas.toDataURL();
		res(b64);

	})
}

function rescale(src, newWidth, newHeight){
	return new Promise((res, rej) => {

		let img = new Image;
		img.src = src;

		img.onload = function(){
			let canvas = document.createElement("canvas");
			canvas.width = newWidth;
			canvas.height = newHeight;
			
			let ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0, 0, newWidth, newHeight);

			let b64 = canvas.toDataURL();
			res(b64);
		}

		img.onerror = function(error){
			rej(error);
		}

	});
}

async function generateImages(event){
	if (!event.target.files) return;
	if (!event.target.files[0]) return;
	
	for (let flagFile of event.target.files){
		let flagB64 = await fileToB64(flagFile);
		
		inputPreview.src = flagB64;
		let output = document.createElement("div");
		output.classList.add("output");

		for (let imgType of DATA.img_types){
			
			// 1) Scale Flag to Size of mask
			let maskSrc = `img/${imgType.mask_src}`;
			let maskData = await srcToArray(maskSrc);
			let maskSize = [maskData[0].length, maskData.length];

			let maskedFlagData = await srcToArray(await rescale(flagB64, ...maskSize));

			// 2) Apply mask to rescaled flag
			for (let y = 0; y < maskData.length; y++){
				for (let x = 0; x < maskData[0].length; x++){
					let alpha = maskData[y][x][3];
					
					if (alpha === 0)	maskedFlagData[y][x] = [0,0,0,0];
					else				maskedFlagData[y][x][3] = alpha;
				}
			}

			// 3) Add whitespace on all sides equally so that it's the same size as the overlay
			let overlaySrc = `img/${imgType.overlay_src}`;
			let overlayData = await srcToArray(overlaySrc);
			let overlaySize = [overlayData[0].length, overlayData.length];

			let whitespaceX = Math.floor(overlaySize[0] / 2) - Math.floor(maskSize[0] / 2);
			let whitespaceY = Math.floor(overlaySize[1] / 2) - Math.floor(maskSize[1] / 2);

			if (whitespaceX <= 0 || whitespaceY <= 0) throw Exception();

			let finalMask = Array(overlaySize[1])
				.fill(null).map(() => Array(overlaySize[0])
					.fill([0, 0, 0, 0])
				);

			for (let y = 0; y < maskData.length; y++){
				for (let x = 0; x < maskData[0].length; x++){
					finalMask[x + whitespaceX][y + whitespaceY] = maskedFlagData[x][y];
				}
			}

			// 4) Combine the final mask with the overlay image
			for (let y = 0; y < overlayData.length; y++){
				for (let x = 0; x < overlayData[0].length; x++){

					if (overlayData[y][x][3] !== 0 && finalMask[y][x][3] !== 0){
						finalMask[y][x][3] = 255 - overlayData[y][x][3];
						overlayData[y][x] = addColors(overlayData[y][x], finalMask[y][x]);
					}

				}
			}

			let finalImage = await arrayToSrc(overlayData.flat(1), overlaySize)

			let img = document.createElement("img");
			img.src = finalImage;
			output.appendChild(img);
		}
		outputs.appendChild(output);
	}

}
