import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { PhysicalName } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface EksProps extends cdk.StackProps {
  cluster: eks.Cluster
}

export interface ClusterProps extends cdk.StackProps {
  onDemandInstanceType: string,
  onDemandInstanceCapacity: number,
  primaryRegion: string,
}

export interface CicdProps extends cdk.StackProps {
  firstRegionCluster: eks.Cluster,
  secondRegionCluster: eks.Cluster,
  firstRegionRole: iam.Role,
  secondRegionRole: iam.Role,
  firstRegion: string,
  secondRegion: string
}

export class ClusterStack extends cdk.Stack {

  public readonly cluster: eks.Cluster;
  public readonly firstRegionRole: iam.Role;
  public readonly secondRegionRole: iam.Role;
  public readonly vpc: ec2.IVpc

  constructor(scope: Construct, id: string, props: ClusterProps) {
    super(scope, id, props);

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'eksCluster', {
      clusterName: `moira`,
      mastersRole: clusterAdmin,
      version: eks.KubernetesVersion.V1_26,
      defaultCapacity: props.onDemandInstanceCapacity,
      defaultCapacityInstance: new ec2.InstanceType(props.onDemandInstanceType)
    });

    this.cluster = cluster;
    this.vpc = cluster.vpc;

    if (cdk.Stack.of(this).region == props.primaryRegion) {
      this.firstRegionRole = createDeployRole(this, `for-1st-region`, cluster);
    }
    else {
      this.secondRegionRole = createDeployRole(this, `for-2nd-region`, cluster);
    }
  }
}

function createDeployRole(scope: Construct, id: string, cluster: eks.Cluster): iam.Role {
  const role = new iam.Role(scope, id, {
    roleName: PhysicalName.GENERATE_IF_NEEDED,
    assumedBy: new iam.AccountRootPrincipal()
  });
  cluster.awsAuth.addMastersRole(role);

  return role;
}


