//mapbox3DTiles.mjs
//import { DRACOLoader } from "./draco/DRACOLoader.js";
const dracoLoader = new THREE.DRACOLoader();
THREE.DRACOLoader.decoderPath = './extensions/draco/';


export class TileSet {
	async load(url, styleParams) {
		let resourcePath = url.substr(0,url.lastIndexOf('/'));
		const hdr = {headers: {Authorization:`Bearer ${Autodesk.Viewing.Private.token.accessToken}`}};
		let response = await fetch(url, hdr);
		if (!response.ok) return;
		let json = await response.json();
		let updateCallback = () => {};
		this.geometricError = json.root.geometricError * (styleParams.geomScale || 1.0);
		this.root = new Tile(json.root, resourcePath, styleParams, updateCallback, null);
	}
}


export class Tile {
	constructor(json, resourcePath, styleParams, updateCallback, parentRefine, parentTransform) {
		if (!json.boundingVolume) return;
		this.loaded = false;
		this.styleParams = styleParams;
		this.updateCallback = updateCallback;
		this.resourcePath = resourcePath;
		this.totalContent = new THREE.Group();  // Three JS Object3D Group for this tile and all its children
		this.tileContent = new THREE.Group();    // Three JS Object3D Group for this tile's content
		this.childContent = new THREE.Group();    // Three JS Object3D Group for this tile's children
		this.totalContent.add(this.tileContent);
		this.totalContent.add(this.childContent);
		this.boundingVolume = json.boundingVolume;
		this.box = null;
		
		let b = this.boundingVolume.box;
		let extent = [b[0] - b[3], b[1] - b[7], b[0] + b[3], b[1] + b[7]];
		let sw = new THREE.Vector3(extent[0], extent[1], b[2] - b[11]);
		let ne = new THREE.Vector3(extent[2], extent[3], b[2] + b[11]);
		this.box = new THREE.Box3(sw, ne);
		this.refine = json.refine ? json.refine.toUpperCase() : parentRefine;
		this.geometricError = json.geometricError * (styleParams.geomScale || 1.0);
		this.worldTransform = parentTransform ? parentTransform.clone() : new THREE.Matrix4();
		this.transform = json.transform;
		if (this.transform) {
			let tileMatrix = new THREE.Matrix4().fromArray(this.transform);
			this.totalContent.applyMatrix4(tileMatrix);
			this.worldTransform.multiply(tileMatrix);
		}
		this.content = json.content;
		this.children = [];
		if (json.children) {
			for (let i = 0; i < json.children.length; i++) {
				let child = new Tile(json.children[i], resourcePath, styleParams, updateCallback, this.refine, this.worldTransform);
				this.childContent.add(child.totalContent);
				this.children.push(child);
			}
		}
	}

	async load() {
		function decodePNTStoDRC(buffer) {
				let header = new Uint32Array(buffer.slice(0, 28));
				let decoder = new TextDecoder();
				let magic = decoder.decode(new Uint8Array(buffer.slice(0, 4)));
				if (magic != 'pnts') {
					throw new Error(`Invalid magic string, expected '${this.type}', got '${this.magic}'`);
				}
				let featureTableJSONByteLength = header[3];
				let featureTableBinaryByteLength = header[4];
				let batchTableJsonByteLength = header[5];
				let batchTableBinaryByteLength = header[6];
				let featureTableJSON, featureTableBinary;
				let pos = 28; // header length
				if (featureTableJSONByteLength > 0) {
					featureTableJSON = JSON.parse(decoder.decode(new Uint8Array(buffer.slice(pos, pos + featureTableJSONByteLength))));
					pos += featureTableJSONByteLength;
				} else {
					featureTableJSON = {};
				}
				featureTableBinary = buffer.slice(pos, pos + featureTableBinaryByteLength);
				pos += featureTableBinaryByteLength;

				let xlen = featureTableJSON.POINTS_LENGTH;
				let xpos = featureTableJSON.POSITION.byteOffset;
				const buffer2 = featureTableBinary.slice(xpos, xpos + xlen * Float32Array.BYTES_PER_ELEMENT * 3);
				return buffer2;
		};

		async function loadPNTS(url) {
			return new Promise(async (resolve) => {
				const hdr = {headers: {Authorization:`Bearer ${Autodesk.Viewing.Private.token.accessToken}`}};
				let response = await fetch(url, hdr);
				let drcbuffer = await response.arrayBuffer();
				const buffer = decodePNTStoDRC(drcbuffer);
				//decode PNTS -> DRC
				dracoLoader.decodeDracoFile(buffer, geometry => {
					const col = geometry.attributes.color.array;
					col.forEach((a, i) => { col[i] /= 255 });
					resolve(geometry);
				});
			})
		};

		if (this.unloadedTileContent) {
			this.totalContent.add(this.tileContent);
			this.unloadedTileContent = false;
		}
		if (this.unloadedChildContent) {
			this.totalContent.add(this.childContent);
			this.unloadedChildContent = false;
		}
		if (this.loaded) {
			this.updateCallback();
			return;
		}
		this.loaded = true;
		if (!this.content) return;
		let url = this.content.uri ? this.content.uri : this.content.url;
		if (!url) return;
		let type = url.split(".")[1];

		let b = this.boundingVolume.box;
		let extent = [b[0] - b[3], b[1] - b[7], b[0] + b[3], b[1] + b[7]];
		let sw = new THREE.Vector3(extent[0], extent[1], b[2] - b[11]);
		let ne = new THREE.Vector3(extent[2], extent[3], b[2] + b[11]);
		this.box = new THREE.Box3(sw, ne);

		if (this.styleParams.showDebugBoxes) {
			let geom = new THREE.BoxGeometry(b[3] * 2, b[7] * 2, b[11] * 2);
			let box = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ wireframe:true, color: Math.random()*0xffffff }));
			let trans = new THREE.Matrix4().makeTranslation(b[0], b[1], b[2]);
			box.applyMatrix4(trans);
			this.tileContent.add(box);
		}

		switch (type) {
			case 'json':
				// child is a tileset json
				let subTileset = new TileSet(() => this.updateCallback());
				await subTileset.load(url, this.styleParams);
				if (subTileset.root) {
					this.box.applyMatrix4(this.worldTransform);
					let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
					this.totalContent.applyMatrix4(inverseMatrix);
					this.totalContent.updateMatrixWorld();
					this.worldTransform = new THREE.Matrix4();

					this.children.push(subTileset.root);
					this.childContent.add(subTileset.root.totalContent);
					subTileset.root.totalContent.updateMatrixWorld();
					subTileset.root.checkLoad(this.frustum, this.camera.position);
				}				
				break;

			case 'pnts':
				let geometry = await loadPNTS(`${this.resourcePath}/${url}`);
				geometry.isPoints = true;
				let material = new THREE.PointsMaterial({ size: this.styleParams.pointSize, sizeAttenuation: false, vertexColors: true });
				this.points = new THREE.PointCloud(geometry, material);
				this.tileContent.add(this.points);
				break;
		}
		this.updateCallback();
	}

	unload(includeChildren) {

		this.unloadedTileContent = true;
		this.totalContent.remove(this.tileContent);
		this.unloadedChildContent = true;
		this.totalContent.remove(this.childContent);

		//this.totalContent.remove(this.childContent);


	}

	checkLoad(frustum, position) {

		let worldBox = this.box.clone().applyMatrix4(this.worldTransform);
		let dist = worldBox.distanceToPoint(position);
		if (this.geometricError > 0.0 && dist > this.geometricError * 50.0) {
			this.unload(true);
			return;
		} else {
			this.load();
			this.children.forEach(child => {
				child.checkLoad(frustum, position);
			});
		}		
	}

}
