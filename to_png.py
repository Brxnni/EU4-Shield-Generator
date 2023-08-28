import	re
import	os
from	PIL import Image

def convertDDS(filePath, newFilePath):
	img = Image.open(filePath)
	img.save(newFilePath)

def convertTGA(filePath, newFilePath):
	img = Image.open(filePath)
	img.save(newFilePath, compression = None)

def convertFile(filePath, deleteOld = False):

	newFilePath = re.sub("(dds|tga)$", "png", filePath)
	
	fileExtension = filePath.split(".")[-1]
	match fileExtension:
		case "dds": convertDDS(filePath, newFilePath)
		case "tga": convertTGA(filePath, newFilePath)
	
	if deleteOld:
		os.remove(filePath)

def convertTree(treePath, deleteOld = False):
	print(treePath)

	for path, dirs, files in os.walk(treePath):
		for fileName in files:
			print(fileName)
			if re.search("(dds|tga)$", fileName):
				print("converting", path, fileName)
				convertFile(os.path.join(path, fileName), deleteOld)

convertTree(
    os.path.join(
		os.path.dirname(__file__),
		# "shield_img"
	),
    False
)
