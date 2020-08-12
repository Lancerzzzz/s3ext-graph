/**
 * Created by Lance on 2020/8/10.
 */

const ArgumentType = Scratch.ArgumentType;
const BlockType = Scratch.BlockType;
const formatMessage = Scratch.formatMessage;
const log = Scratch.log;

const menuIconURI = null;
const blockIconURI = null;

class graph{
  constructor (runtime){
    this.runtime = runtime;
    // communication related
    this.comm = runtime.ioDevices.comm;
    this.session = null;
    this.runtime.registerPeripheralExtension('graph', this);
    // session callbacks
    this.reporter = null;
    this.onmessage = this.onmessage.bind(this);
    this.onclose = this.onclose.bind(this);
    this.write = this.write.bind(this);
    // string op
    this.decoder = new TextDecoder();
    this.lineBuffer = '';
	
	this.point_sum = 0;
	this.points = [];
	this.graph_list = [];
	this.MAX_value = 9999999;
  }

  onclose (){
    this.session = null;
  }

  write (data, parser = null){
    if (this.session){
      return new Promise(resolve => {
        if (parser){
          this.reporter = {
            parser,
            resolve
          }
        }
        this.session.write(data);
      })
    }
  }

  onmessage (data){
    const dataStr = this.decoder.decode(data);
    this.lineBuffer += dataStr;
    if (this.lineBuffer.indexOf('\n') !== -1){
      const lines = this.lineBuffer.split('\n');
      this.lineBuffer = lines.pop();
      for (const l of lines){
        if (this.reporter){
          const {parser, resolve} = this.reporter;
          resolve(parser(l));
        };
      }
    }
  }

  scan (){
    this.comm.getDeviceList().then(result => {
        this.runtime.emit(this.runtime.constructor.PERIPHERAL_LIST_UPDATE, result);
    });
  }

  getInfo (){
    return {
      id: 'graph',
      name: 'graph',
      color1: '#114eeb',
      color2: '#0ccae4',
      blocks: [
        {
          opcode: 'AddPoint',
          blockType: BlockType.COMMAND,
          arguments: {
            PointA: {
              type: ArgumentType.STRING
            }
          },
          text: '添加点 [PointA]'
        },
        {
          opcode: 'SetEdge',
          blockType: BlockType.COMMAND,
          arguments: {
            PointA: {
              type: ArgumentType.STRING
            },
            PointB: {
              type: ArgumentType.STRING
            }
          },
          text: '设置边 [PointA] [PointB]'
        },
        {
          opcode: 'GetShortestPath',
          blockType: BlockType.REPORTER,
          arguments: {
            start: {
              type: ArgumentType.STRING
            },
            stop: {
              type: ArgumentType.STRING
            }
          },
          text: '获取最短路径 [start] [stop]'
        },
		{
          opcode: 'GetAllPoints',
          blockType: BlockType.REPORTER,
          arguments: {
            start: {
              type: ArgumentType.STRING
            },
            stop: {
              type: ArgumentType.STRING
            }
          },
          text: '所有点'
        }
      ]
    }
  }

    AddPoint (args, util){
        const PointA = args.PointA;
        this.point_sum += 1;
        if(PointA === ""){
			return "Add faild";
        }else if (this.points.indexOf(PointA) == -1){
			            this.points.push(PointA);
            for (let i = 0; i < this.point_sum; i++){
                this.graph_list[i] = new Array(this.point_sum).fill(this.MAX_value);
            }
            return "Add sueessfuly";	
		}else{
            return "Add faild";
        }

    }

    SetEdge (args, util){
        const PointA = args.PointA;
        const PointB = args.PointB;
        let cost  = 1;
        let i = 0;
        let j = 0;
        if (this.points.indexOf(PointA) !== -1 ){
            i = this.points.indexOf(PointA);
            if (this.points.indexOf(PointB) !== -1 ){
                j = this.points.indexOf(PointB);
                this.graph_list[i][j] = cost;
                this.graph_list[j][i] = cost;
                return "setedge finished";
            }else {
                return false;
            }
        }
        else{
            return false;
        }
    }
	GetAllPoints(args, util){
		return this.points.toString();
	}
    GetShortestPath (args, util){
        const start = args.start;
        const stop = args.stop;
        if (this.graph_list == null){
            return null;
        }
        if(this.points.indexOf(start)===-1 || this.points.indexOf(stop)===-1){
            return this.points.toString();
        }
        let start_index = this.points.indexOf(start);
        let dist = new Array(this.point_sum).fill(this.MAX_value);
        dist[start_index] = 0;
        let path = {};
        for(let i in this.points){
            path[this.points[i]] = [];
        }
        path[start] = [start];
        let S = [];
        let Q = [...this.points];

        while(Q.length !== 0){
            let u_dist = {};
            for(let i in Q){
                let c = Q[i];
                let d = dist[this.points.indexOf(c)];
                u_dist[c] = d;

            }
            let u = Object.keys(u_dist)[0];
            // console.log(Object.keys(u_dist)[0])
            for(let key in u_dist){
                if(u_dist[u]>u_dist[key]){
                    u = key;
                }
            }
            S.push(u);
            let index = Q.indexOf(u);
            let temp =  Q[Q.length-1];
            Q[Q.length-1] = u;
            Q[index] = temp;
            Q.pop();

            let temp_graph = this.graph_list[this.points.indexOf(u)];
            for(let v in temp_graph){
                let d = temp_graph[v];
                if(0 < d && d < this.MAX_value){
                    if(dist[v]>(dist[this.points.indexOf(u)]+d)){
                        dist[v] = dist[this.points.indexOf(u)]+d;
                        let last_point = u;
                        // console.log(path[points[v]])
                        let temp = this.points[v];
                        if (path[temp] !== null){
                            path[temp] = [path[temp]+last_point,temp];
                        }else{
                            path[temp] = [last_point,temp];
                        }

                    }
                }
            }

        }
        let shortest_path = {};
        for(let i in this.points){
            let point = this.points[i];
            shortest_path[point] = [...path[point]];
            if(path[i] !== start){
                while(shortest_path[point][0]!== start){
                    let temp = shortest_path[point][0]
                    shortest_path[point].unshift(path[temp][0])
                }
            }

        }
        return shortest_path[stop].toString();
    }

}

module.exports = graph;