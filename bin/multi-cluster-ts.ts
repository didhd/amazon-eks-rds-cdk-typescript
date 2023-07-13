#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClusterStack } from '../lib/cluster-stack';
import { ContainerStack } from '../lib/container-stack';
import { CicdStack } from '../lib/cicd-stack';
import { AuroraPrimaryStack, AuroraSecondaryStack, AuroraProps } from '../lib/aurora-stack';

const app = new cdk.App();

const account = app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const primaryRegion = { account: account, region: 'us-east-2' };
const secondaryRegion = { account: account, region: 'eu-west-2' };
const primaryOnDemandInstanceType = 'm5.xlarge';
const secondaryOnDemandInstanceType = 'm5.xlarge';

const primaryCluster = new ClusterStack(app, `ClusterStack-${primaryRegion.region}`, {
    env: primaryRegion,
    onDemandInstanceType: primaryOnDemandInstanceType,
    onDemandInstanceCapacity: 2,
    primaryRegion: primaryRegion.region
});

new ContainerStack(app, `ContainerStack-${primaryRegion.region}`, { env: primaryRegion, cluster: primaryCluster.cluster });

const secondaryCluster = new ClusterStack(app, `ClusterStack-${secondaryRegion.region}`, {
    env: secondaryRegion,
    onDemandInstanceType: secondaryOnDemandInstanceType,
    onDemandInstanceCapacity: 0,
    primaryRegion: primaryRegion.region
});

new ContainerStack(app, `ContainerStack-${secondaryRegion.region}`, { env: secondaryRegion, cluster: secondaryCluster.cluster });

new CicdStack(app, `CicdStack`, {
    env: primaryRegion,
    firstRegion: primaryRegion.region,
    secondRegion: secondaryRegion.region,
    firstRegionCluster: primaryCluster.cluster,
    secondRegionCluster: secondaryCluster.cluster,
    firstRegionRole: primaryCluster.firstRegionRole,
    secondRegionRole: secondaryCluster.secondRegionRole
});

const stackM = new AuroraPrimaryStack(app, 'AuroraPrimaryStack', { env: primaryRegion, vpc: primaryCluster.vpc });
const stackS = new AuroraSecondaryStack(app, 'AuroraSecondaryStack', { env: secondaryRegion, vpc: secondaryCluster.vpc });

stackM.addDependency(stackS)
// add second region cluster
stackM.globaldbM.addRegionalCluster(stackM, 'AddRegionalRDS', {
    region: secondaryRegion.region,
    dbSubnetGroupName: stackS.globaldbS.dbSubnetGroup.dbSubnetGroupName,
});

app.synth();